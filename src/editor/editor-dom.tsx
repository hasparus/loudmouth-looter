import { SITE_NAME } from "../lib/siteMeta";

import {
  buildToggleElement,
  SLASH_COMMANDS,
  type SlashCommand,
} from "./editor-atoms";
import {
  escapeHtml,
  plainTextToHtml,
  sanitizeHtml,
  sanitizeImageSrc,
  sanitizeUrl,
  unescapeHtml,
} from "./editor-sanitize";
import {
  htmlIsThinTextWrapper,
  markdownPasteHtml,
} from "./editor-markdown-paste";

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

const BLOCK_TAGS = new Set([
  "BLOCKQUOTE",
  "H1",
  "H2",
  "H3",
  "HR",
  "OL",
  "P",
  "PRE",
  "UL",
]);

// Elements whose text is already formatted (or must stay literal) — the
// inline Markdown transform never reaches inside them.
const INLINE_FORMATTED_TAGS = new Set([
  "A",
  "B",
  "CODE",
  "DEL",
  "EM",
  "I",
  "S",
  "STRIKE",
  "STRONG",
]);

const CODE_SPAN = /`([^`]+)`/g;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
// `*x*` italics: not part of `**`, not inside a word, no inner padding — so
// `2 * 3 * 4` and a half-typed `**bold*` stay literal.
const STAR_ITALIC = /(?<![*\w])\*(?=[^\s*])([^*]*?[^\s*])\*(?![*\w])/g;
const INLINE_SYNTAX = [
  /\*\*[^*]+\*\*/,
  /_[^_]+_/,
  /~~[^~]+~~/,
  /`[^`]+`/,
  new RegExp(STAR_ITALIC.source),
  new RegExp(LINK.source),
];

export function formatInline(text: string) {
  const held: string[] = [];
  const hold = (html: string) => `\u0000${held.push(html) - 1}\u0000`;
  // Code spans first, so their contents stay literal (no links or emphasis).
  const withCode = escapeHtml(text).replaceAll(CODE_SPAN, (_, code: string) =>
    hold(`<code>${code}</code>`),
  );
  const withLinks = withCode.replaceAll(
    LINK,
    (whole, label: string, url: string) => {
      const href = sanitizeUrl(unescapeHtml(url));
      if (!href) return whole;
      return hold(
        `<a href="${escapeHtml(href)}" rel="noreferrer">${formatEmphasis(label)}</a>`,
      );
    },
  );
  const restore = (html: string): string =>
    html.replaceAll(
      // eslint-disable-next-line no-control-regex -- NUL is a deliberate placeholder sentinel
      /\u0000(\d+)\u0000/g,
      (_, index: string) => restore(held[Number(index)] ?? ""),
    );
  return restore(formatEmphasis(withLinks));
}

function formatEmphasis(escaped: string) {
  return escaped
    .replaceAll(/\*\*([^*]+)\*\*([.,!?])?/g, "<strong>$1$2</strong>")
    .replaceAll(STAR_ITALIC, "<i>$1</i>")
    .replaceAll(/_([^_]+)_([.,!?])?/g, "<i>$1$2</i>")
    .replaceAll(/~~([^~]+)~~/g, "<s>$1</s>");
}

function normalizeEditableText(text: string) {
  return text.replaceAll("\u200B", "").replaceAll("\u00A0", " ");
}

const CARET_BLOCK_TAGS = new Set(["H1", "H2", "H3", "LI", "P", "PRE"]);

export function getCurrentBlock(
  root: HTMLElement,
  anchor: Node | null = globalThis.getSelection()?.anchorNode ?? null,
) {
  if (!anchor || !root.contains(anchor)) return null;

  let node: Node | null = anchor;
  while (node && node !== root) {
    if (node instanceof HTMLElement && CARET_BLOCK_TAGS.has(node.tagName)) {
      // A Move card's title row is laid out by the card, not edited as prose.
      if (node.tagName === "H3" && node.closest(".te-move")) return null;
      return node;
    }
    node = node.parentNode;
  }

  return null;
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function placeCaretAtStart(element: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

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
  selection: { offset: number; path: number[] } | null;
}

function captureSelection(root: HTMLElement): UndoSnapshot["selection"] {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const path: number[] = [];
  let node: Node = range.startContainer;
  while (node !== root) {
    const parent: ParentNode | null = node.parentNode;
    if (!parent) return null;
    path.unshift([...parent.childNodes].indexOf(node as ChildNode));
    node = parent;
  }
  return { offset: range.startOffset, path };
}

export function restoreSelection(
  root: HTMLElement,
  snapshot: UndoSnapshot["selection"],
) {
  if (!snapshot) return;

  let node: Node = root;
  for (const index of snapshot.path) {
    const child: ChildNode | undefined = node.childNodes[index];

    if (!child) return;
    node = child;
  }

  const limit =
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent ?? "").length
      : node.childNodes.length;
  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(node, Math.min(snapshot.offset, limit));
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
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

function restorePendingImageFallbacks(parent: ParentNode) {
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
    else if (
      node instanceof Element &&
      !INLINE_FORMATTED_TAGS.has(node.tagName)
    )
      text += " ";
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

function insertCaretMarker(root: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;

  const marker = document.createElement("span");
  marker.dataset.caretMarker = "true";
  marker.setAttribute("contenteditable", "false");
  marker.textContent = "\u200B";
  range.insertNode(marker);
  return marker;
}

function restoreCaretFromMarker(marker: HTMLElement) {
  const parent = marker.parentNode;
  if (!(parent instanceof HTMLElement)) return;

  const boundary = document.createTextNode("\u200B");

  marker.replaceWith(boundary);

  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.setStart(boundary, 1);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function transformInlineTextNodes(node: Node): boolean {
  let changed = false;

  if (node instanceof Text) {
    const raw = normalizeEditableText(node.textContent);
    if (!INLINE_SYNTAX.some((syntax) => syntax.test(raw))) return false;

    const wrapper = document.createElement("span");
    wrapper.innerHTML = formatInline(raw);

    if (wrapper.textContent === raw && wrapper.children.length === 0)
      return false;

    node.replaceWith(...wrapper.childNodes);
    return true;
  }

  if (!(node instanceof HTMLElement)) return false;
  if (node.dataset.caretMarker === "true") return false;
  if (INLINE_FORMATTED_TAGS.has(node.tagName)) return false;

  for (const child of [...node.childNodes]) {
    changed = transformInlineTextNodes(child) || changed;
  }

  return changed;
}

function absorbTrailingPunctuation(block: HTMLElement) {
  let changed = false;

  for (const child of [...block.childNodes]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName !== "STRONG" && child.tagName !== "I") continue;

    const next = child.nextSibling;
    if (!(next instanceof Text)) continue;

    const match = /^(\u200B*)([.,!?])(.*)$/s.exec(next.textContent);
    if (!match?.[2]) continue;

    child.append(match[2]);
    next.textContent = `${match[1]}${match[3]}`;
    if (!next.textContent) next.remove();
    changed = true;
  }

  return changed;
}

export function normalizeEmptyBlocks(root: HTMLElement) {
  for (const tag of ["p", "h1", "h2", "h3", "li"]) {
    for (const el of root.querySelectorAll(tag)) {
      if (el.childNodes.length === 0) {
        el.append(document.createElement("br"));
      }
    }
  }
  for (const pre of root.querySelectorAll("pre")) {
    pre.textContent ||= "\n";
  }
  for (const quote of root.querySelectorAll("blockquote")) {
    if (quote.childNodes.length === 0) quote.innerHTML = "<p><br></p>";
  }
}

export function applyInlineTransform(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (
    !block ||
    block.tagName === "PRE" ||
    (block.tagName === "LI" && block.closest("ul, ol") === null)
  )
    return;

  const raw = normalizeEditableText(block.textContent);
  let changed = false;

  if (INLINE_SYNTAX.some((syntax) => syntax.test(raw))) {
    const marker = insertCaretMarker(root);
    changed = transformInlineTextNodes(block);

    if (marker && changed) {
      restoreCaretFromMarker(marker);
    } else {
      marker?.remove();
    }
  }

  if (absorbTrailingPunctuation(block)) {
    placeCaretAtEnd(block);
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
  if (closestWithin(range.startContainer, "code", root)) return null;

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
  if (state.blockTag === "PRE") return [];
  return SLASH_COMMANDS.filter(
    (command) =>
      command.name.startsWith(state.query) &&
      (command.kind === "track" ||
        (state.slashAtBlockStart && state.blockTag === "P")),
  );
}

export function handleEnter(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (!block) return false;

  if (block.tagName === "PRE") return handleCodeEnter(block);

  const rawText = normalizeEditableText(block.textContent);

  if (block.tagName === "P" && !block.className) {
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(rawText.trim()))
      return replaceWithRule(block);

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

  const headingPrefix = /^#{1,3} /.exec(rawText)?.[0];
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

  if (
    block.tagName === "H1" ||
    block.tagName === "H2" ||
    block.tagName === "H3"
  ) {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    block.after(paragraph);
    placeCaretAtEnd(paragraph);
    return true;
  }

  return false;
}

function replaceWithRule(block: HTMLElement) {
  const rule = document.createElement("hr");
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  block.replaceWith(rule, paragraph);
  placeCaretAtStart(paragraph);
  return true;
}

export function replaceWithCodeBlock(block: HTMLElement, lang: string) {
  const pre = document.createElement("pre");
  if (lang) pre.dataset.lang = lang;
  pre.textContent = "\n";
  block.replaceWith(pre);
  if (!pre.nextElementSibling) {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    pre.after(paragraph);
  }
  placeCaretAtStart(pre);
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

// Code blocks keep a trailing "\n" sentinel so an empty last line has height
// (the MDX serializer drops it). Enter inserts a newline; Enter on an empty
// last line leaves the block.
function handleCodeEnter(pre: HTMLElement) {
  const split = splitCodeAtCaret(pre);
  if (!split) return false;
  const { head, tail } = split;

  if (head.endsWith("\n") && (tail === "" || tail === "\n")) {
    if (head.length > 0) pre.textContent = head;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    pre.after(paragraph);
    placeCaretAtStart(paragraph);
    return true;
  }

  insertCodeText(pre, "\n");
  return true;
}

function splitCodeAtCaret(pre: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!pre.contains(range.startContainer)) return null;
  range.deleteContents();
  const before = document.createRange();
  before.selectNodeContents(pre);
  before.setEnd(range.startContainer, range.startOffset);
  const head = before.toString();
  return { head, tail: (pre.textContent ?? "").slice(head.length) };
}

// Code blocks hold a single text node; edits rewrite it and put the caret
// back by offset.
export function insertCodeText(pre: HTMLElement, text: string) {
  const split = splitCodeAtCaret(pre);
  if (!split) return;
  let next = split.head + text + split.tail;
  if (!next.endsWith("\n")) next += "\n";
  pre.textContent = next;
  const node = pre.firstChild;
  const selection = globalThis.getSelection();
  if (!node || !selection) return;
  const caret = document.createRange();
  caret.setStart(node, split.head.length + text.length);
  caret.collapse(true);
  selection.removeAllRanges();
  selection.addRange(caret);
}

export function closestWithin(
  node: Node | null,
  selector: string,
  root: HTMLElement,
): HTMLElement | null {
  const element =
    node instanceof Element ? node : (node?.parentElement ?? null);
  const match = element?.closest<HTMLElement>(selector) ?? null;
  return match && root.contains(match) && match !== root ? match : null;
}

export function editorRange(editor: HTMLElement): Range | null {
  const selection = globalThis.getSelection();
  if (
    !selection ||
    selection.rangeCount === 0 ||
    !editor.contains(selection.anchorNode)
  )
    return null;
  return selection.getRangeAt(0);
}

function selectPasteCaret(range: Range) {
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

type ImageSettlement = { id: string; html: string };
type PasteCommit = (image?: ImageSettlement) => void;
let nextPendingImageId = 0;

function insertImageFile(
  editor: HTMLElement,
  file: File,
  onCommit: PasteCommit,
) {
  const range = editorRange(editor)?.cloneRange();
  if (!range || !/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) return;

  const previous = range.cloneContents();
  restorePendingImageFallbacks(previous);
  const container = document.createElement("div");
  container.append(previous.cloneNode(true));
  const previousHtml = container.innerHTML;
  const preview = URL.createObjectURL(file);
  const id = String(++nextPendingImageId);
  const img = document.createElement("img");
  img.src = preview;
  img.dataset.pendingImage = id;
  img.dataset.pendingFallback = previousHtml;
  range.deleteContents();
  range.insertNode(img);
  range.setStartAfter(img);
  range.collapse(true);
  selectPasteCaret(range);

  const currentImage = () =>
    editor.isConnected
      ? editor.querySelector<HTMLImageElement>(
          `img[data-pending-image="${id}"]`,
        )
      : null;
  const fail = () => {
    const target = currentImage();
    URL.revokeObjectURL(preview);
    if (!target) return;
    target.replaceWith(previous);
    onCommit({ id, html: previousHtml });
  };
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const src =
      typeof reader.result === "string" ? sanitizeImageSrc(reader.result) : "";
    if (!src) {
      fail();
      return;
    }
    const target = currentImage();
    URL.revokeObjectURL(preview);
    if (!target) return;
    target.src = src;
    delete target.dataset.pendingImage;
    delete target.dataset.pendingFallback;
    onCommit({ id, html: target.outerHTML });
  });
  reader.addEventListener("error", fail);
  reader.addEventListener("abort", fail);
  try {
    reader.readAsDataURL(file);
  } catch {
    fail();
  }
}

export function handleEditorPaste(
  editor: HTMLElement,
  clipboard: DataTransfer,
  onCommit: PasteCommit,
) {
  const imageFile = [...clipboard.files].find((file) =>
    file.type.startsWith("image/"),
  );
  if (imageFile) {
    insertImageFile(editor, imageFile, onCommit);
    return;
  }

  const range = editorRange(editor)?.cloneRange();
  if (!range) return;
  const currentBlock = getCurrentBlock(editor, range.startContainer);
  const html = clipboard.getData("text/html");
  const text = clipboard.getData("text/plain");

  // Code is literal: paste the plain text, never markup.
  if (currentBlock?.tagName === "PRE") {
    insertCodeText(currentBlock, text.replaceAll(/\r\n?/g, "\n"));
    onCommit();
    return;
  }
  const inlineCode = closestWithin(range.startContainer, "code", editor);
  if (inlineCode) {
    range.deleteContents();
    const node = document.createTextNode(text.replaceAll(/\s+/g, " "));
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selectPasteCaret(range);
    onCommit();
    return;
  }

  // A URL pasted over selected prose links the selection.
  const url = text.trim();
  if (
    !range.collapsed &&
    currentBlock?.contains(range.endContainer) &&
    /^(?:https?:\/\/|mailto:)\S+$/.test(url) &&
    sanitizeUrl(url) &&
    !closestWithin(range.commonAncestorContainer, "a", editor)
  ) {
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("rel", "noreferrer");
    link.append(range.extractContents());
    range.insertNode(link);
    range.selectNodeContents(link);
    selectPasteCaret(range);
    onCommit();
    return;
  }
  const explicitMarkdown = clipboard.getData("text/markdown");
  let cleanHtml = html
    ? sanitizeHtml(html)
    : plainTextToHtml(text || explicitMarkdown);
  let inlineMarkdown = false;

  const markdown = explicitMarkdown.trim() ? explicitMarkdown : text;
  if (markdown && htmlIsThinTextWrapper(html, markdown)) {
    const parsed = markdownPasteHtml(markdown, !!explicitMarkdown.trim());
    if (parsed) {
      cleanHtml = sanitizeHtml(parsed.html);
      inlineMarkdown = parsed.inline;
    }
  }

  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = cleanHtml;
  const content = template.content;
  if (
    inlineMarkdown &&
    currentBlock &&
    currentBlock.contains(range.startContainer) &&
    currentBlock.contains(range.endContainer) &&
    content.childElementCount === 1 &&
    content.firstElementChild?.tagName === "P"
  ) {
    content.replaceChildren(...content.firstElementChild.childNodes);
  }
  const hasBlockChild = [...content.childNodes].some(
    (n) => n instanceof Element && BLOCK_TAGS.has(n.tagName),
  );

  if (!hasBlockChild || !currentBlock) {
    const lastNode = content.lastChild;
    range.insertNode(content);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
    }
    selectPasteCaret(range);
    normalizeEmptyBlocks(editor);
    onCommit();
    return;
  }

  const list = currentBlock.closest("ul, ol");
  const insertAfter =
    currentBlock.tagName === "LI" && list ? list : currentBlock;
  const shouldSplitTail = insertAfter === currentBlock;

  let tail: DocumentFragment | null = null;
  if (shouldSplitTail) {
    const tailRange = document.createRange();
    tailRange.setStart(range.endContainer, range.endOffset);
    tailRange.setEndAfter(currentBlock.lastChild ?? currentBlock);
    tail = tailRange.extractContents();
  }

  let previous: ChildNode = insertAfter;
  for (const node of [...content.childNodes]) {
    if (node instanceof Element && BLOCK_TAGS.has(node.tagName)) {
      previous.after(node);
      previous = node;
    } else {
      const wrapper = document.createElement("p");
      wrapper.append(node);
      previous.after(wrapper);
      previous = wrapper;
    }
  }

  if (tail && tail.childNodes.length > 0) {
    const tailBlock = document.createElement("p");
    tailBlock.append(tail);
    previous.after(tailBlock);
  }

  if (previous instanceof HTMLElement) {
    range.selectNodeContents(previous);
    range.collapse(false);
  }
  selectPasteCaret(range);
  normalizeEmptyBlocks(editor);
  onCommit();
}
