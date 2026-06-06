/** @jsxImportSource react */
import {
  buildToggleElement,
  populateToggleElement,
  type Shape,
  SLASH_COMMANDS,
  type SlashCommand,
} from "./editor-atoms";

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

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(text: string) {
  return escapeHtml(text.replaceAll(/\r\n?/g, "\n")).replaceAll("\n", "<br>");
}

const ALLOWED_TAGS = new Set([
  "BR",
  "H1",
  "H2",
  "I",
  "LI",
  "OL",
  "P",
  "STRONG",
  "UL",
]);
const BLOCK_TAGS = new Set(["H1", "H2", "OL", "P", "UL"]);
// Dropped entirely — subtree is discarded. Includes foreign-namespace
// containers (SVG, MATH) whose descendants have lowercase tagNames and
// can smuggle executable-looking elements past an uppercase-only check.
const DROPPED_TAGS = new Set([
  "IFRAME",
  "MATH",
  "OBJECT",
  "SCRIPT",
  "STYLE",
  "SVG",
]);
const TAG_RENAME: Record<string, string> = { B: "STRONG", EM: "I" };

// Editor atoms (see editor-atoms.tsx) are embedded as elements carrying a
// known class. The sanitizer must preserve them across the localStorage
// round-trip — but strictly: only the class plus a small set of validated
// attributes survive, everything else is still dropped. The class must be
// *exactly* the atom name (a second class flips it back to the flatten path).
const ATOM_TAGS: Record<string, string> = {
  "te-arrow": "P",
  "te-chevron": "P",
  "te-task": "LI",
  "te-toggle": "BUTTON",
  "te-track": "SPAN",
};
const SHAPES = new Set(["circle", "rhomb", "square"]);

function sanitizeInto(source: ParentNode, target: ParentNode) {
  for (const child of source.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      target.append(child.cloneNode(false));
      continue;
    }
    if (!(child instanceof Element)) continue;

    // Normalise: SVG/MathML elements keep case-preserved tagNames
    // (lowercase), HTML elements are uppercase. Compare in one case.
    const rawTag = child.tagName.toUpperCase();
    const tag = TAG_RENAME[rawTag] ?? rawTag;

    if (DROPPED_TAGS.has(tag)) continue;

    // Editor atom: keep the element with its class and validated attrs only.
    const atomClass = child.getAttribute("class");
    if (
      atomClass &&
      ATOM_TAGS[atomClass] === tag &&
      child instanceof HTMLElement
    ) {
      const el = document.createElement(tag.toLowerCase());
      el.className = atomClass;
      if (atomClass === "te-track") {
        el.setAttribute("contenteditable", "false");
      }
      if (atomClass === "te-toggle") {
        const rawShape = child.dataset.shape ?? "";
        const shape = (SHAPES.has(rawShape) ? rawShape : "square") as Shape;
        populateToggleElement(
          el,
          shape,
          child.getAttribute("aria-checked") === "true",
        );
      }
      target.append(el);
      sanitizeInto(child, el);
      continue;
    }

    if (ALLOWED_TAGS.has(tag)) {
      const el = document.createElement(tag.toLowerCase());
      target.append(el);
      sanitizeInto(child, el);
      continue;
    }

    // Disallowed wrapper: flatten — keep descendant content, drop the tag.
    sanitizeInto(child, target);
  }
}

export function sanitizeHtml(html: string): string {
  // <template> content is an inert DocumentFragment — scripts don't run,
  // images don't fetch, event handlers don't fire during parse.
  const template = document.createElement("template");
  template.innerHTML = html;
  const clean = document.createElement("div");
  sanitizeInto(template.content, clean);
  return clean.innerHTML;
}

// Deliberately lossy. `**foo * bar**` won't match (lone `*` inside kills it)
// and `foo_bar_baz` will italicize mid-word. Full Commonmark is out of scope.
function formatInline(text: string) {
  return escapeHtml(text)
    .replaceAll(/\*\*([^*]+)\*\*([.,!?])?/g, "<strong>$1$2</strong>")
    .replaceAll(/_([^_]+)_([.,!?])?/g, "<i>$1$2</i>");
}

function normalizeEditableText(text: string) {
  return text.replaceAll("\u200B", "").replaceAll("\u00A0", " ");
}

export function getCurrentBlock(root: HTMLElement) {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!root.contains(selection.anchorNode)) return null;

  let node: Node | null = selection.anchorNode;
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
  // Only walk top-level text nodes — do not descend into inline children
  // so a pasted <strong>- text</strong> isn't mis-identified as the prefix.
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

  // Prefix chars remain in the block's text node (range started past them);
  // strip them now so the block only holds post-caret content.
  if (prefixNode) {
    prefixNode.data = prefixNode.data.slice(prefix.length);
    if (!prefixNode.data) prefixNode.remove();
  }

  return fragment;
}

function extractAfterCaret(block: HTMLElement): DocumentFragment {
  // An empty block has nothing after the caret — and setEndAfter(block) would
  // reach past the block boundary, so bail with an empty fragment.
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

// Places the caret immediately after a block's first child — used for atoms
// whose first child is a contenteditable=false toggle the caret must clear.
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

// Roving tabindex: each track keeps exactly one toggle in the Tab order, so
// Tab enters/leaves the group and ArrowLeft/Right move within it.
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

// Records the caret as a child-index path from `root` — survives an
// innerHTML restore because the restored DOM is byte-identical.
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

function saveImmediate(root: HTMLElement) {
  try {
    localStorage.setItem(STORAGE_KEY, serializeDocument(root));
  } catch (error) {
    // Quota exceeded or storage unavailable — keep editing rather than throw
    // an uncaught error mid-keystroke.
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
    const raw = normalizeEditableText(node.textContent ?? "");
    if (!raw.includes("**") && !raw.includes("_")) return false;

    const wrapper = document.createElement("span");
    wrapper.innerHTML = formatInline(raw);

    if (wrapper.textContent === raw && wrapper.children.length === 0)
      return false;

    node.replaceWith(...wrapper.childNodes);
    return true;
  }

  if (!(node instanceof HTMLElement)) return false;
  if (node.dataset.caretMarker === "true") return false;
  if (node.tagName === "STRONG" || node.tagName === "I") return false;

  // Snapshot: recursion may replaceWith() on children and mutate the live list.
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const child of [...node.childNodes]) {
    changed = transformInlineTextNodes(child) || changed;
  }

  return changed;
}

function absorbTrailingPunctuation(block: HTMLElement) {
  let changed = false;

  // Snapshot: body mutates siblings (appends to child, rewrites next text node).
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const child of [...block.childNodes]) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName !== "STRONG" && child.tagName !== "I") continue;

    const next = child.nextSibling;
    if (!(next instanceof Text)) continue;

    const match = next.textContent?.match(/^(\u200B*)([.,!?])(.*)$/s);
    if (!match) continue;

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

  const raw = normalizeEditableText(block.textContent ?? "");
  let changed = false;

  if (/\*\*[^*]+\*\*/.test(raw) || /_[^_]+_/.test(raw)) {
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

// `- [ ] ` / `- [x] ` shorthand. Fires on input the moment the trailing space
// completes the marker, so the checkbox appears immediately rather than on
// Enter like the other block transforms. Returns the pre-transform snapshot
// when it fired (for custom undo), or null when nothing changed.
export function applyTaskShorthand(root: HTMLElement): UndoSnapshot | null {
  const block = getCurrentBlock(root);
  if (!block) return null;

  const text = normalizeEditableText(block.textContent ?? "");

  if (block.tagName === "P") {
    const match = text.match(/^[-*+] \[([ xX])\] $/);
    if (!match) return null;

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
    const match = text.match(/^\[([ xX])\] /);
    if (!match) return null;

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
  // Placement: left edge + width follow the editor's text column so the menu
  // lines up with the paragraph; top follows the caret's line.
  anchor: { width: number; left: number; top: number };
  blockTag: string;
  count: number | null;
  query: string;
  // Whether the `/` sits at the very start of its block — block commands
  // (which restyle a whole <p>) are only offered there.
  slashAtBlockStart: boolean;
}

// The query reaches from the `/` to the caret: a command name, then an
// optional count. SLASH_QUERY_BOUNDED additionally anchors the `/` to a word
// boundary so prose like `and/or` and dates never open the menu.
export const SLASH_QUERY = /\/([a-z-]*)(?: +(\d+))? *$/;
const SLASH_QUERY_BOUNDED = /(^|\s)\/([a-z-]*)(?: +(\d+))? *$/;
export const SLASH_MENU_ID = "te-slash-menu";
export const slashOptionId = (name: string) => `te-slash-option-${name}`;

// The .te-track immediately before a collapsed caret, if any — lets
// Backspace peel one toggle off a track instead of deleting the whole atom.
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

// Moves focus to the previous/next toggle within the same track — the roving
// arrow-key navigation of the toggle button-group.
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

  const localMatch = range.startContainer.data
    .slice(0, range.startOffset)
    .match(SLASH_QUERY);
  if (!localMatch) return null;

  const block = getCurrentBlock(root);
  if (!block) return null;

  const blockRange = document.createRange();
  blockRange.selectNodeContents(block);
  blockRange.setEnd(range.startContainer, range.startOffset);
  const blockMatch = blockRange.toString().match(SLASH_QUERY_BOUNDED);
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
    query: localMatch[1],
    slashAtBlockStart: blockMatch[1] === "",
  };
}

// Track commands apply anywhere; block commands only at the start of a plain
// paragraph (commitSlash adds the class to a <p>, so nothing else qualifies).
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

  const rawText = normalizeEditableText(block.textContent ?? "");

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

  // `- ` / `* ` / `+ ` start an unordered list; `1. ` an ordered one. The
  // caret lands in a fresh trailing item so the list keeps going on Enter;
  // an Enter on that still-empty item exits the list (see the LI branch).
  const bulletMatch = rawText.match(/^[-*+] /);
  const listMatch = bulletMatch ?? rawText.match(/^\d+\. /);
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

    // Enter on an empty styled line exits it back to a plain paragraph.
    if (!rawText.trim()) {
      block.classList.remove(className);
      placeCaretAtEnd(block);
      return true;
    }

    // Otherwise split into another line of the same kind.
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

    // Continue a task list: a fresh item carries its own checkbox.
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

// Sanitizes pasted content and splices it in at the caret. Block-level paste
// is threaded between the halves of the current block to avoid invalid
// nesting (e.g. <p>…<h1>…</h1>…</p>); a paste inside a list item is inserted
// after the enclosing list so the item stays valid.
export function handleEditorPaste(
  editor: HTMLElement,
  clipboard: DataTransfer,
) {
  const html = clipboard.getData("text/html");
  const text = clipboard.getData("text/plain");
  const cleanHtml = html ? sanitizeHtml(html) : plainTextToHtml(text);

  const selection = globalThis.getSelection();
  if (
    !selection ||
    selection.rangeCount === 0 ||
    !editor.contains(selection.anchorNode)
  )
    return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = cleanHtml;
  const content = template.content;
  const hasBlockChild = [...content.childNodes].some(
    (n) => n instanceof Element && BLOCK_TAGS.has(n.tagName),
  );

  if (!hasBlockChild) {
    const lastNode = content.lastChild;
    range.insertNode(content);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    normalizeEmptyBlocks(editor);
    flushSave(editor);
    return;
  }

  const currentBlock = getCurrentBlock(editor);
  if (!currentBlock) {
    editor.append(content);
    normalizeEmptyBlocks(editor);
    flushSave(editor);
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
  // Snapshot: previous.after(node) moves node out of content, mutating the
  // live childNodes list.
  // eslint-disable-next-line unicorn/no-useless-spread
  for (const node of [...content.childNodes]) {
    if (node instanceof Element && BLOCK_TAGS.has(node.tagName)) {
      previous.after(node);
      previous = node;
    } else {
      // Top-level inline/text among blocks: wrap in a paragraph.
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

  if (previous instanceof HTMLElement) placeCaretAtEnd(previous);
  normalizeEmptyBlocks(editor);
  flushSave(editor);
}
