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

const BLOCK_TAGS = new Set(["H1", "H2", "OL", "P", "UL"]);

export function formatInline(text: string) {
  const links: string[] = [];
  const withLinks = escapeHtml(text).replaceAll(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (whole, label: string, url: string) => {
      const href = sanitizeUrl(unescapeHtml(url));
      if (!href) return whole;
      links.push(
        `<a href="${escapeHtml(href)}" rel="noreferrer">${formatEmphasis(label)}</a>`,
      );
      return `\u0000${links.length - 1}\u0000`;
    },
  );
  return formatEmphasis(withLinks).replaceAll(
    // eslint-disable-next-line no-control-regex -- NUL is a deliberate placeholder sentinel
    /\u0000(\d+)\u0000/g,
    (_, index: string) => links[Number(index)] ?? "",
  );
}

function formatEmphasis(escaped: string) {
  return escaped
    .replaceAll(/\*\*([^*]+)\*\*([.,!?])?/g, "<strong>$1$2</strong>")
    .replaceAll(/_([^_]+)_([.,!?])?/g, "<i>$1$2</i>");
}

function normalizeEditableText(text: string) {
  return text.replaceAll("\u200B", "").replaceAll("\u00A0", " ");
}

export function getCurrentBlock(
  root: HTMLElement,
  anchor: Node | null = globalThis.getSelection()?.anchorNode ?? null,
) {
  if (!anchor || !root.contains(anchor)) return null;

  let node: Node | null = anchor;
  while (node && node !== root) {
    if (
      node instanceof HTMLElement &&
      ["H1", "H2", "LI", "P"].includes(node.tagName)
    ) {
      return node;
    }
    node = node.parentNode;
  }

  return null;
}

function placeCaretAtEnd(element: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function placeCaretAtStart(element: HTMLElement) {
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

export function serializeDocument(root: HTMLElement): string {
  return root.innerHTML.replaceAll("\u200B", "");
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
    if (!raw.includes("**") && !raw.includes("_") && !raw.includes("]("))
      return false;

    const wrapper = document.createElement("span");
    wrapper.innerHTML = formatInline(raw);

    if (wrapper.textContent === raw && wrapper.children.length === 0)
      return false;

    node.replaceWith(...wrapper.childNodes);
    return true;
  }

  if (!(node instanceof HTMLElement)) return false;
  if (node.dataset.caretMarker === "true") return false;
  if (node.tagName === "STRONG" || node.tagName === "I" || node.tagName === "A")
    return false;

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
  for (const tag of ["p", "h1", "h2", "li"]) {
    for (const el of root.querySelectorAll(tag)) {
      if (el.childNodes.length === 0) {
        el.append(document.createElement("br"));
      }
    }
  }
}

export function applyInlineTransform(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (!block || (block.tagName === "LI" && block.closest("ul, ol") === null))
    return;

  const raw = normalizeEditableText(block.textContent);
  let changed = false;

  if (
    /\*\*[^*]+\*\*/.test(raw) ||
    /_[^_]+_/.test(raw) ||
    /\[[^\]]+\]\([^)\s]+\)/.test(raw)
  ) {
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

export function handleEnter(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (!block) return false;

  const rawText = normalizeEditableText(block.textContent);

  if (
    block.tagName === "P" &&
    (rawText.startsWith("## ") || rawText.startsWith("# "))
  ) {
    const prefix = rawText.startsWith("## ") ? "## " : "# ";
    const tag = prefix === "## " ? "h2" : "h1";
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

  if (block.tagName === "H1" || block.tagName === "H2") {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    block.after(paragraph);
    placeCaretAtEnd(paragraph);
    return true;
  }

  return false;
}

function editorRange(editor: HTMLElement): Range | null {
  const selection = globalThis.getSelection();
  if (
    !selection ||
    selection.rangeCount === 0 ||
    !editor.contains(selection.anchorNode)
  )
    return null;
  return selection.getRangeAt(0);
}

function isAttachedEditorRange(editor: HTMLElement, range: Range): boolean {
  return (
    editor.isConnected &&
    editor.contains(range.startContainer) &&
    editor.contains(range.endContainer)
  );
}

function isSelectedEditorRange(editor: HTMLElement, range: Range): boolean {
  const selected = editorRange(editor);
  return (
    !!selected &&
    selected.startContainer === range.startContainer &&
    selected.startOffset === range.startOffset &&
    selected.endContainer === range.endContainer &&
    selected.endOffset === range.endOffset
  );
}

function selectPasteCaret(range: Range, shouldSelect: boolean) {
  if (!shouldSelect) return;
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

async function insertImageFile(editor: HTMLElement, file: File, range: Range) {
  const src = await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(typeof reader.result === "string" ? reader.result : null),
    );
    reader.addEventListener("error", () => resolve(null));
    reader.readAsDataURL(file);
  });
  if (!src || !isAttachedEditorRange(editor, range)) return null;
  const safeSrc = sanitizeImageSrc(src);
  if (!safeSrc) return null;
  const img = document.createElement("img");
  img.setAttribute("src", safeSrc);

  const shouldSelect = isSelectedEditorRange(editor, range);
  range.deleteContents();
  range.insertNode(img);
  range.setStartAfter(img);
  range.collapse(true);

  selectPasteCaret(range, shouldSelect);
  return range.cloneRange();
}

export function readEditorClipboard(
  editor: HTMLElement,
  clipboard: DataTransfer,
) {
  const range = editorRange(editor)?.cloneRange();
  if (!range) return null;
  return {
    range,
    block: getCurrentBlock(editor, range.startContainer),
    imageFile: [...clipboard.files].find((file) =>
      file.type.startsWith("image/"),
    ),
    html: clipboard.getData("text/html"),
    text: clipboard.getData("text/plain"),
    markdown: clipboard.getData("text/markdown"),
  };
}

type EditorClipboard = NonNullable<ReturnType<typeof readEditorClipboard>>;

export async function handleEditorPaste(
  editor: HTMLElement,
  clipboard: EditorClipboard,
) {
  const { range, block: currentBlock, html, text } = clipboard;
  if (clipboard.imageFile)
    return insertImageFile(editor, clipboard.imageFile, range);

  const explicitMarkdown = clipboard.markdown;
  let cleanHtml = html
    ? sanitizeHtml(html)
    : plainTextToHtml(text || explicitMarkdown);
  let inlineMarkdown = false;

  if (text || explicitMarkdown.trim()) {
    try {
      const { htmlIsThinTextWrapper, markdownPasteHtml } =
        await import("./editor-markdown-paste");
      const markdown = explicitMarkdown.trim() ? explicitMarkdown : text;
      if (htmlIsThinTextWrapper(html, markdown)) {
        const parsed = markdownPasteHtml(markdown, !!explicitMarkdown.trim());
        if (parsed) {
          cleanHtml = sanitizeHtml(parsed.html);
          inlineMarkdown = parsed.inline;
        }
      }
    } catch {
      cleanHtml = html
        ? sanitizeHtml(html)
        : plainTextToHtml(text || explicitMarkdown);
    }
  }

  if (!isAttachedEditorRange(editor, range)) return null;
  const shouldSelect = isSelectedEditorRange(editor, range);
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

  if (!hasBlockChild) {
    const lastNode = content.lastChild;
    range.insertNode(content);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
    }
    selectPasteCaret(range, shouldSelect);
    normalizeEmptyBlocks(editor);
    return range.cloneRange();
  }

  if (!currentBlock) {
    const lastNode = content.lastChild;
    range.insertNode(content);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
    }
    selectPasteCaret(range, shouldSelect);
    normalizeEmptyBlocks(editor);
    return range.cloneRange();
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
  selectPasteCaret(range, shouldSelect);
  normalizeEmptyBlocks(editor);
  return range.cloneRange();
}
