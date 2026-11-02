import { SITE_NAME } from "../lib/siteMeta";

import {
  buildToggleElement,
  SLASH_COMMANDS,
  type SlashCommand,
} from "./editor-atoms";
import { replaceWithCodeBlock } from "./editor-code-block";
import { normalizeEditableText } from "./editor-inline";
import {
  breaksWords,
  MAX_HEADING_LEVEL,
  TEXT_BLOCK_TAGS,
} from "./editor-schema";
import {
  captureSelection,
  getCurrentBlock,
  placeCaretAtEnd,
  placeCaretAtStart,
  type SelectionPath,
} from "./editor-selection";

export const STORAGE_KEY = "text-editor-document";
const STORAGE_LEGACY_KEYS: string[] = [];
export const SPELLCHECK_KEY = "text-editor-spellcheck";

export function migrateStorage() {
  if (localStorage.getItem(STORAGE_KEY)) return;
  for (const key of STORAGE_LEGACY_KEYS) {
    const data = localStorage.getItem(key);
    if (data) {
      localStorage.setItem(STORAGE_KEY, data);
      localStorage.removeItem(key);
      return;
    }
  }
}

export const DEFAULT_HTML = [
  "<h1>The Plan of the Parliament of Erl</h1>",
  "<p>In their ruddy jackets of leather that reached to their knees the men of Erl appeared before their lord, the stately white-haired man in his long red room. He leaned in his carven chair and heard their spokesman.</p>",
  '<p>"For seven hundred years the chiefs of your race have ruled us well; and their deeds are remembered by the minor minstrels, living on yet in their little tinkling songs. And yet the generations stream away, and there is no new thing."</p>',
  '<p>"What would you?" said the lord.</p>',
  '<p>"We would be ruled by a magic lord," they said.</p>',
  "<p><i>— Lord Dunsany, The King of Elfland's Daughter (1924)</i></p>",
].join("");

function findPrefixTextNode(block: HTMLElement, prefix: string): Text | null {
  for (const child of block.childNodes) {
    if (child instanceof Text && child.data.startsWith(prefix)) return child;
  }
  return null;
}

function extractBeforeCaret(
  block: HTMLElement,
  prefix: string,
): DocumentFragment {
  const prefixNode = findPrefixTextNode(block, prefix);
  const selection = globalThis.getSelection();

  const range = document.createRange();
  if (prefixNode) range.setStart(prefixNode, prefix.length);
  else range.setStart(block, 0);

  if (
    selection &&
    selection.rangeCount > 0 &&
    block.contains(selection.anchorNode)
  ) {
    const caret = selection.getRangeAt(0);
    range.setEnd(caret.endContainer, caret.endOffset);
  } else {
    range.setEndAfter(block.lastChild ?? block);
  }

  const fragment = range.extractContents();

  if (prefixNode) {
    prefixNode.data = prefixNode.data.slice(prefix.length);
    if (!prefixNode.data) prefixNode.remove();
  }

  return fragment;
}

function extractAfterCaret(block: HTMLElement): DocumentFragment {
  if (!block.lastChild) return document.createDocumentFragment();

  const selection = globalThis.getSelection();
  const range = document.createRange();

  if (
    selection &&
    selection.rangeCount > 0 &&
    block.contains(selection.anchorNode)
  ) {
    const caret = selection.getRangeAt(0);
    range.setStart(caret.endContainer, caret.endOffset);
  } else {
    range.setStart(block, block.childNodes.length);
  }
  range.setEndAfter(block.lastChild);

  return range.extractContents();
}

function setCaretAfterFirstChild(element: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(element, Math.min(1, element.childNodes.length));
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function moveChildrenInto(source: ParentNode, target: ParentNode) {
  while (source.firstChild) target.append(source.firstChild);
}

export function normalizeTrackTabindexes(root: HTMLElement) {
  for (const track of root.querySelectorAll(".te-track")) {
    const toggles = track.querySelectorAll<HTMLElement>(".te-toggle");
    for (const [index, toggle] of toggles.entries()) {
      toggle.tabIndex = index === 0 ? 0 : -1;
    }
  }
}

export interface UndoSnapshot {
  html: string;
  selection: SelectionPath;
}

export function captureSnapshot(root: HTMLElement): UndoSnapshot {
  return { html: root.innerHTML, selection: captureSelection(root) };
}

export function updateSnapshotImage(
  snapshot: UndoSnapshot,
  image: { id: string; html: string },
): UndoSnapshot {
  const template = document.createElement("template");
  template.innerHTML = snapshot.html;
  const pending = template.content.querySelector(
    `[data-pending-image="${image.id}"]`,
  );
  if (!pending) return snapshot;
  const replacement = document.createElement("template");
  replacement.innerHTML = image.html;
  pending.replaceWith(replacement.content);
  return { ...snapshot, html: template.innerHTML };
}

export function restorePendingImageFallbacks(parent: ParentNode) {
  let image = parent.querySelector<HTMLElement>("[data-pending-image]");
  while (image) {
    const fallback = document.createElement("template");
    fallback.innerHTML = image.dataset.pendingFallback ?? "";
    image.replaceWith(fallback.content);
    image = parent.querySelector<HTMLElement>("[data-pending-image]");
  }
}

export function serializeDocument(root: HTMLElement): string {
  if (!root.querySelector("[data-pending-image]"))
    return root.innerHTML.replaceAll("\u200B", "");
  const copy = root.cloneNode(true) as HTMLElement;
  restorePendingImageFallbacks(copy);
  return copy.innerHTML.replaceAll("\u200B", "");
}

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

// Prose words only: block MDX atoms show source previews, not writing. Block
// boundaries count as spaces so adjacent paragraphs don't fuse into one word.
export function countWords(root: HTMLElement): number {
  let text = "";
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) =>
        node instanceof HTMLElement && node.classList.contains("te-jsx")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    },
  );
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text) text += node.data;
    else if (node instanceof Element && breaksWords(node)) text += " ";
  }
  let count = 0;
  for (const segment of wordSegmenter.segment(text))
    if (segment.isWordLike) count++;
  return count;
}

const EDITOR_FALLBACK_TITLE = "editor";

export function readDocumentTitle(root: HTMLElement): string {
  const h1 = root.querySelector("h1");
  const text = (h1?.textContent ?? "").trim();
  return text || EDITOR_FALLBACK_TITLE;
}

export function syncDocumentTitle(root: HTMLElement) {
  document.title = `${readDocumentTitle(root)} \u2014 ${SITE_NAME}`;
}

function saveImmediate(root: HTMLElement) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeDocument(root));
  } catch (error) {
    // eslint-disable-next-line no-console -- diagnostic for a caught browser-storage failure
    console.warn("text-editor: could not persist the document", error);
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function save(root: HTMLElement) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveImmediate(root);
    saveTimer = null;
  }, 200);
}

export function flushSave(root: HTMLElement) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveImmediate(root);
}

const TEXT_ELEMENTS = [...TEXT_BLOCK_TAGS, "LI"].join(",");

export function normalizeEmptyBlocks(root: HTMLElement) {
  for (const el of root.querySelectorAll(TEXT_ELEMENTS)) {
    if (el.childNodes.length === 0) el.append(document.createElement("br"));
  }
  for (const pre of root.querySelectorAll("pre")) {
    pre.textContent ||= "\n";
  }
  for (const quote of root.querySelectorAll("blockquote")) {
    if (quote.childNodes.length === 0) quote.innerHTML = "<p><br></p>";
  }
}

export function applyTaskShorthand(root: HTMLElement): UndoSnapshot | null {
  const block = getCurrentBlock(root);
  if (!block) return null;

  const text = normalizeEditableText(block.textContent);

  if (block.tagName === "P") {
    const match = /^[-*+] \[([ xX])\] $/.exec(text);
    if (!match?.[1]) return null;

    const snapshot = captureSnapshot(root);
    const item = document.createElement("li");
    item.className = "te-task";
    item.append(buildToggleElement("square", match[1].toLowerCase() === "x"));
    const list = document.createElement("ul");
    list.append(item);
    block.replaceWith(list);
    setCaretAfterFirstChild(item);
    return snapshot;
  }

  if (block.tagName === "LI" && !block.classList.contains("te-task")) {
    const match = /^\[([ xX])\] /.exec(text);
    if (!match?.[1]) return null;

    const prefixNode = findPrefixTextNode(block, match[0]);
    if (!prefixNode) return null;

    const snapshot = captureSnapshot(root);
    prefixNode.data = prefixNode.data.slice(match[0].length);
    if (!prefixNode.data) prefixNode.remove();
    block.classList.add("te-task");
    block.prepend(buildToggleElement("square", match[1].toLowerCase() === "x"));
    return snapshot;
  }

  return null;
}

export interface SlashState {
  anchor: { width: number; left: number; top: number };
  blockTag: string;
  count: number | null;
  query: string;
  slashAtBlockStart: boolean;
}

export const SLASH_QUERY = /\/([a-z-]*)(?: +(\d+))? *$/;
const SLASH_QUERY_BOUNDED = /(^|\s)\/([a-z-]*)(?: +(\d+))? *$/;
export const SLASH_MENU_ID = "te-slash-menu";
export const slashOptionId = (name: string) => `te-slash-option-${name}`;

export function trackBeforeCaret(root: HTMLElement): HTMLElement | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!range.collapsed || !root.contains(range.startContainer)) return null;

  let before: Node | null;
  if (range.startContainer instanceof Text) {
    if (range.startOffset !== 0) return null;
    before = range.startContainer.previousSibling;
  } else {
    before = range.startContainer.childNodes[range.startOffset - 1] ?? null;
  }

  return before instanceof HTMLElement && before.classList.contains("te-track")
    ? before
    : null;
}

export function focusSiblingToggle(
  toggle: Element,
  direction: "ArrowLeft" | "ArrowRight",
) {
  const track = toggle.closest(".te-track");
  if (!track) return;
  const toggles = [...track.querySelectorAll<HTMLButtonElement>(".te-toggle")];
  const index = toggles.indexOf(toggle as HTMLButtonElement);
  const step = direction === "ArrowRight" ? 1 : -1;
  toggles[(index + step + toggles.length) % toggles.length]?.focus();
}

export function readSlashState(root: HTMLElement): SlashState | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!range.collapsed || !(range.startContainer instanceof Text)) return null;
  if (!root.contains(range.startContainer)) return null;

  const localMatch = SLASH_QUERY.exec(
    range.startContainer.data.slice(0, range.startOffset),
  );
  if (!localMatch) return null;

  const block = getCurrentBlock(root);
  if (!block) return null;

  const blockRange = document.createRange();
  blockRange.selectNodeContents(block);
  blockRange.setEnd(range.startContainer, range.startOffset);
  const blockMatch = SLASH_QUERY_BOUNDED.exec(blockRange.toString());
  if (!blockMatch) return null;

  const caretRect = range.getBoundingClientRect();
  const editorRect = root.getBoundingClientRect();

  return {
    anchor: {
      width: editorRect.width,
      left: editorRect.left,
      top: caretRect.bottom,
    },
    blockTag: block.tagName,
    count: localMatch[2] ? Number.parseInt(localMatch[2], 10) : null,
    query: localMatch[1] ?? "",
    slashAtBlockStart: blockMatch[1] === "",
  };
}

export function matchSlashCommands(state: SlashState): SlashCommand[] {
  return SLASH_COMMANDS.filter(
    (command) =>
      command.name.startsWith(state.query) &&
      (command.kind === "track" ||
        (state.slashAtBlockStart && state.blockTag === "P")),
  );
}

const HEADING_PREFIX = new RegExp(`^#{1,${MAX_HEADING_LEVEL}} `);

export function handleEnter(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (!block) return false;

  const rawText = normalizeEditableText(block.textContent);

  if (block.tagName === "P" && !block.className) {
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(rawText.trim())) {
      block.replaceChildren();
      return insertRule(block);
    }

    const fence = /^```([\w+#.-]*)$/.exec(rawText.trim());
    if (fence) return replaceWithCodeBlock(block, fence[1] ?? "");

    if (rawText.startsWith("> ")) {
      const quote = document.createElement("blockquote");
      const first = document.createElement("p");
      first.append(extractBeforeCaret(block, "> "));
      const next = document.createElement("p");
      const hasAfter = block.hasChildNodes();
      if (hasAfter) moveChildrenInto(block, next);
      else next.innerHTML = "<br>";
      quote.append(first, next);
      block.replaceWith(quote);
      if (hasAfter) placeCaretAtStart(next);
      else placeCaretAtEnd(next);
      return true;
    }

    // An empty line inside a quote ends the quote, like an empty list item.
    if (!rawText.trim() && block.parentElement?.tagName === "BLOCKQUOTE") {
      liftOutOfQuote(block);
      placeCaretAtStart(block);
      return true;
    }
  }

  const headingPrefix = HEADING_PREFIX.exec(rawText)?.[0];
  if (block.tagName === "P" && headingPrefix) {
    const prefix = headingPrefix;
    const tag = `h${prefix.length - 1}`;
    const heading = document.createElement(tag);
    heading.append(extractBeforeCaret(block, prefix));

    const paragraph = document.createElement("p");
    const hasAfter = block.hasChildNodes();
    if (hasAfter) moveChildrenInto(block, paragraph);
    else paragraph.innerHTML = "<br>";

    block.replaceWith(heading);
    heading.after(paragraph);
    if (hasAfter) placeCaretAtStart(paragraph);
    else placeCaretAtEnd(paragraph);
    return true;
  }

  const bulletMatch = /^[-*+] /.exec(rawText);
  const listMatch = bulletMatch ?? /^\d+\. /.exec(rawText);
  if (block.tagName === "P" && listMatch) {
    const firstItem = document.createElement("li");
    firstItem.append(extractBeforeCaret(block, listMatch[0]));

    const nextItem = document.createElement("li");
    const hasAfter = block.hasChildNodes();
    if (hasAfter) moveChildrenInto(block, nextItem);
    else nextItem.innerHTML = "<br>";

    const list = document.createElement(bulletMatch ? "ul" : "ol");
    list.append(firstItem, nextItem);
    block.replaceWith(list);

    if (hasAfter) placeCaretAtStart(nextItem);
    else placeCaretAtEnd(nextItem);
    return true;
  }

  if (
    block.tagName === "P" &&
    (block.classList.contains("te-arrow") ||
      block.classList.contains("te-chevron"))
  ) {
    const className = block.classList.contains("te-arrow")
      ? "te-arrow"
      : "te-chevron";

    if (!rawText.trim()) {
      block.classList.remove(className);
      placeCaretAtEnd(block);
      return true;
    }

    const paragraph = document.createElement("p");
    paragraph.className = className;
    const tail = extractAfterCaret(block);
    if (tail.childNodes.length > 0) paragraph.append(tail);
    else paragraph.innerHTML = "<br>";
    block.after(paragraph);
    placeCaretAtStart(paragraph);
    return true;
  }

  if (block.tagName === "LI") {
    const text = rawText.trim();

    if (text && block.classList.contains("te-task")) {
      const item = document.createElement("li");
      item.className = "te-task";
      item.append(buildToggleElement("square", false));
      const tail = extractAfterCaret(block);
      if (tail.childNodes.length > 0) item.append(tail);
      block.after(item);
      setCaretAfterFirstChild(item);
      return true;
    }

    if (text) return false;

    const list = block.parentElement;
    if (!list) return false;

    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    list.after(paragraph);
    block.remove();
    if (list.children.length === 0) list.remove();
    placeCaretAtEnd(paragraph);
    return true;
  }

  if (block.tagName !== "P" && TEXT_BLOCK_TAGS.has(block.tagName)) {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    block.after(paragraph);
    placeCaretAtEnd(paragraph);
    return true;
  }

  return false;
}

// A divider above `block`, which keeps the caret.
export function insertRule(block: HTMLElement) {
  block.before(document.createElement("hr"));
  if (!block.textContent && !block.firstElementChild)
    block.replaceChildren(document.createElement("br"));
  placeCaretAtStart(block);
  return true;
}

// Moves `block` out of its <blockquote>, splitting the quote around it so the
// blocks before and after stay quoted.
export function liftOutOfQuote(block: HTMLElement) {
  const quote = block.parentElement;
  if (!quote || quote.tagName !== "BLOCKQUOTE") return;
  const after = document.createElement("blockquote");
  while (block.nextSibling) after.append(block.nextSibling);
  quote.after(block);
  if (after.hasChildNodes()) block.after(after);
  if (!quote.hasChildNodes()) quote.remove();
}
