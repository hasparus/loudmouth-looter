// Formatting commands behind the editor's keyboard shortcuts, plus the
// Backspace and typography rules. Each command mutates the DOM directly and
// reports whether it did anything; the caller snapshots for undo and saves.

import { buildToggleElement } from "./editor-atoms";
import {
  closestWithin,
  editorRange,
  getCurrentBlock,
  insertCodeText,
  liftOutOfQuote,
  placeCaretAtStart,
} from "./editor-dom";
import { htmlToMdx } from "./editor-mdx";
import { sanitizeUrl } from "./editor-sanitize";

export type BlockType = "h1" | "h2" | "h3" | "p";
export type ListKind = "ol" | "task" | "ul";

export type EditorCommand =
  | { kind: "block"; type: BlockType }
  | { kind: "code" }
  | { kind: "ignore" }
  | { kind: "link" }
  | { kind: "list"; list: ListKind }
  | { kind: "native"; name: "bold" | "italic" | "strikeThrough" }
  | { kind: "paragraph-below" }
  | { kind: "quote" };

const BLOCK_TYPES: BlockType[] = ["p", "h1", "h2", "h3"];

// Shortcuts follow Writer (and most Markdown editors): Mod-B/I/E/K,
// Mod-Shift-X, Mod-Alt-0…3, Mod-Shift-7/8/9/., Mod-Shift-Enter, Mod-Enter.
export function commandForKey(event: KeyboardEvent): EditorCommand | null {
  if (!event.metaKey && !event.ctrlKey) return null;
  const key = event.key.toLowerCase();

  if (event.altKey && !event.shiftKey) {
    // Option rewrites event.key on macOS, so read the physical key there. On
    // Windows/Linux Ctrl+Alt is AltGr, which types characters on many layouts
    // — only take it when the key really is a digit.
    const digit = event.metaKey
      ? /^Digit([0-3])$/.exec(event.code)?.[1]
      : /^[0-3]$/.exec(event.key)?.[0];
    const type = digit === undefined ? undefined : BLOCK_TYPES[Number(digit)];
    return type ? { kind: "block", type } : null;
  }
  if (event.altKey) return null;

  if (event.shiftKey) {
    if (key === "x") return { kind: "native", name: "strikeThrough" };
    if (event.code === "Digit7") return { kind: "list", list: "ol" };
    if (event.code === "Digit8") return { kind: "list", list: "ul" };
    if (event.code === "Digit9" || key === "enter")
      return { kind: "list", list: "task" };
    if (event.code === "Period") return { kind: "quote" };
    return null;
  }

  if (key === "b") return { kind: "native", name: "bold" };
  if (key === "i") return { kind: "native", name: "italic" };
  if (key === "e") return { kind: "code" };
  if (key === "k") return { kind: "link" };
  // Underline has no Markdown form and would vanish on save.
  if (key === "u") return { kind: "ignore" };
  if (key === "enter") return { kind: "paragraph-below" };
  return null;
}

export function runCommand(editor: HTMLElement, command: EditorCommand) {
  switch (command.kind) {
    case "block":
      return setBlockType(editor, command.type);
    case "code":
      return toggleInlineCode(editor);
    case "ignore":
      return false;
    case "link":
      return toggleLink(editor);
    case "list":
      return toggleList(editor, command.list);
    case "native":
      // The browser's own commands toggle marks across partial selections and
      // land on its native undo stack.

      return document.execCommand(command.name);
    case "paragraph-below":
      return insertParagraphBelow(editor);
    case "quote":
      return toggleQuote(editor);
  }
}

// ── Caret bookkeeping ───────────────────────────────────────────────────────
// Commands that move or rebuild a block lose the live selection; they record
// the caret as a text offset into the block and restore it afterwards.

function caretOffset(block: HTMLElement): number | null {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const caret = selection.getRangeAt(0);
  if (!block.contains(caret.startContainer)) return null;
  const range = document.createRange();
  range.selectNodeContents(block);
  range.setEnd(caret.startContainer, caret.startOffset);
  return range.toString().length;
}

function restoreCaret(block: HTMLElement, offset: number | null) {
  const selection = globalThis.getSelection();
  if (!selection) return;
  let remaining = offset ?? 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(offset === null);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      range.setStart(node, remaining);
      range.collapse(true);
      break;
    }
    remaining -= length;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function withCaret(block: HTMLElement, move: () => HTMLElement) {
  const offset = caretOffset(block);
  restoreCaret(move(), offset);
}

function retag(block: HTMLElement, tag: string): HTMLElement {
  const next = document.createElement(tag);
  while (block.firstChild) next.append(block.firstChild);
  block.replaceWith(next);
  return next;
}

// ── Inline ──────────────────────────────────────────────────────────────────

const WORD_CHAR = /[\p{L}\p{N}_'’-]/u;

function wordRangeAt(range: Range): Range | null {
  const node = range.startContainer;
  if (!(node instanceof Text)) return null;
  const text = node.data;
  let start = range.startOffset;
  let end = range.startOffset;
  while (start > 0 && WORD_CHAR.test(text[start - 1] ?? "")) start--;
  while (end < text.length && WORD_CHAR.test(text[end] ?? "")) end++;
  if (start === end) return null;
  const word = document.createRange();
  word.setStart(node, start);
  word.setEnd(node, end);
  return word;
}

function select(range: Range) {
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function caretAfter(node: Node) {
  // A zero-width boundary outside the element so typing continues unformatted
  // (serializeDocument strips it).
  const boundary = document.createTextNode("​");
  node.parentNode?.insertBefore(boundary, node.nextSibling);
  const range = document.createRange();
  range.setStart(boundary, 1);
  range.collapse(true);
  select(range);
}

function unwrap(element: HTMLElement): Range {
  const range = document.createRange();
  const first = element.firstChild;
  const last = element.lastChild;
  element.replaceWith(...element.childNodes);
  if (first && last) {
    range.setStartBefore(first);
    range.setEndAfter(last);
  }
  return range;
}

function selectionInBlock(editor: HTMLElement) {
  const range = editorRange(editor);
  if (!range) return null;
  const block = getCurrentBlock(editor, range.startContainer);
  if (!block || block.tagName === "PRE") return null;
  if (!block.contains(range.endContainer)) return null;
  return { block, range };
}

export function toggleInlineCode(editor: HTMLElement): boolean {
  const range = editorRange(editor);
  if (!range) return false;

  const code = closestWithin(range.commonAncestorContainer, "code", editor);
  if (code) {
    // Mod-E at the end of a code span steps out of it; anywhere else it
    // turns the span back into text.
    const end = document.createRange();
    end.selectNodeContents(code);
    end.collapse(false);
    if (
      range.collapsed &&
      range.compareBoundaryPoints(Range.START_TO_END, end) === 0
    ) {
      caretAfter(code);
      return true;
    }
    select(unwrap(code));
    return true;
  }

  const target = selectionInBlock(editor);
  if (!target) return false;
  const span = target.range.collapsed
    ? wordRangeAt(target.range)
    : target.range;

  const element = document.createElement("code");
  if (span) {
    element.textContent = span.toString().replaceAll("​", "");
    span.deleteContents();
    span.insertNode(element);
    if (target.range.collapsed) {
      caretAfter(element);
    } else {
      const inside = document.createRange();
      inside.selectNodeContents(element);
      select(inside);
    }
    return true;
  }

  element.textContent = "​";
  target.range.insertNode(element);
  element.after(document.createTextNode("​"));
  const inside = document.createRange();
  inside.setStart(element.firstChild!, 1);
  inside.collapse(true);
  select(inside);
  return true;
}

// Mod-K: inside a link, unlink it. On a selected URL, link it. On selected
// words, write them out as `[words](` so the address can be typed and closed
// with `)` — the same inline Markdown rule then makes the link.
export function toggleLink(editor: HTMLElement): boolean {
  const range = editorRange(editor);
  if (!range) return false;

  const link = closestWithin(range.commonAncestorContainer, "a", editor);
  if (link) {
    select(unwrap(link));
    return true;
  }

  const target = selectionInBlock(editor);
  if (!target) return false;
  const span = target.range.collapsed
    ? wordRangeAt(target.range)
    : target.range;
  if (!span) return false;

  const text = span.toString().trim();
  if (/^(?:https?:\/\/|mailto:)\S+$/.test(text) && sanitizeUrl(text)) {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", text);
    anchor.setAttribute("rel", "noreferrer");
    anchor.append(span.extractContents());
    span.insertNode(anchor);
    caretAfter(anchor);
    return true;
  }

  const holder = document.createElement("p");
  holder.append(span.cloneContents());
  const label = htmlToMdx(holder.outerHTML).trim().replaceAll("\n", " ");
  if (!label) return false;
  const markdown = document.createTextNode(`[${label}](`);
  span.deleteContents();
  span.insertNode(markdown);
  const caret = document.createRange();
  caret.setStart(markdown, markdown.length);
  caret.collapse(true);
  select(caret);
  return true;
}

// ── Blocks ──────────────────────────────────────────────────────────────────

const TEXT_BLOCKS = new Set(["H1", "H2", "H3", "P"]);

export function setBlockType(editor: HTMLElement, type: BlockType): boolean {
  const block = getCurrentBlock(editor);
  if (!block || !TEXT_BLOCKS.has(block.tagName)) return false;
  const tag = type.toUpperCase();
  // Pressing a heading's own shortcut again turns it back into a paragraph.
  const next = block.tagName === tag && tag !== "P" ? "p" : type;
  if (block.tagName === next.toUpperCase() && !block.className) return false;
  withCaret(block, () => retag(block, next));
  return true;
}

// The unit a block-level wrapper acts on: a whole list for a list item.
function blockUnit(block: HTMLElement): HTMLElement {
  if (block.tagName !== "LI") return block;
  const list = block.parentElement;
  return list && (list.tagName === "UL" || list.tagName === "OL")
    ? list
    : block;
}

export function toggleQuote(editor: HTMLElement): boolean {
  const block = getCurrentBlock(editor);
  if (!block || block.tagName === "PRE") return false;
  const unit = blockUnit(block);

  if (unit.parentElement?.tagName === "BLOCKQUOTE") {
    withCaret(block, () => {
      liftOutOfQuote(unit);
      return block;
    });
    return true;
  }

  withCaret(block, () => {
    const previous = unit.previousElementSibling;
    if (previous?.tagName === "BLOCKQUOTE") {
      previous.append(unit);
    } else {
      const quote = document.createElement("blockquote");
      unit.replaceWith(quote);
      quote.append(unit);
    }
    return block;
  });
  return true;
}

function splitListAt(item: HTMLElement): HTMLElement | null {
  const list = item.parentElement;
  if (!list) return null;
  const after = document.createElement(list.tagName.toLowerCase());
  while (item.nextSibling) after.append(item.nextSibling);
  if (after.hasChildNodes()) list.after(after);
  return list;
}

function itemToParagraph(item: HTMLElement): HTMLElement {
  const list = splitListAt(item);
  item.querySelector(":scope > .te-toggle")?.remove();
  const paragraph = retag(item, "p");
  list?.after(paragraph);
  if (list && !list.hasChildNodes()) list.remove();
  return paragraph;
}

function setTask(item: HTMLElement, task: boolean) {
  const toggle = item.querySelector(":scope > .te-toggle");
  if (task && !toggle) {
    item.classList.add("te-task");
    item.prepend(buildToggleElement("square", false));
  } else if (!task) {
    toggle?.remove();
    item.classList.remove("te-task");
    if (!item.getAttribute("class")) item.removeAttribute("class");
  }
}

export function toggleList(editor: HTMLElement, kind: ListKind): boolean {
  const block = getCurrentBlock(editor);
  if (!block) return false;
  const listTag = kind === "ol" ? "OL" : "UL";

  if (block.tagName === "LI") {
    const list = block.parentElement;
    if (!list) return false;
    const isTask = block.classList.contains("te-task");
    if (list.tagName === listTag && (kind === "task") === isTask) {
      withCaret(block, () => itemToParagraph(block));
      return true;
    }
    withCaret(block, () => {
      setTask(block, kind === "task");
      if (list.tagName !== listTag) retag(list, listTag.toLowerCase());
      return block;
    });
    return true;
  }

  if (!TEXT_BLOCKS.has(block.tagName)) return false;
  withCaret(block, () => {
    const item = retag(block, "li");
    const previous = item.previousElementSibling;
    if (previous?.tagName === listTag) {
      previous.append(item);
    } else {
      const list = document.createElement(listTag.toLowerCase());
      item.replaceWith(list);
      list.append(item);
    }
    if (kind === "task") setTask(item, true);
    return item;
  });
  return true;
}

// Mod-Enter: a fresh paragraph below the current block (or its list, quote or
// code block) — the way out of anything.
export function insertParagraphBelow(editor: HTMLElement): boolean {
  const block = getCurrentBlock(editor);
  if (!block) return false;
  let unit = blockUnit(block);
  const quote = unit.parentElement;
  if (quote?.tagName === "BLOCKQUOTE" && quote.lastElementChild === unit)
    unit = quote;
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  unit.after(paragraph);
  placeCaretAtStart(paragraph);
  return true;
}

export function insertCodeIndent(editor: HTMLElement): boolean {
  const block = getCurrentBlock(editor);
  if (block?.tagName !== "PRE") return false;
  insertCodeText(block, "  ");
  return true;
}

// ── Backspace at the start of a block: undo the block's formatting first ──

function caretAtBlockStart(block: HTMLElement): boolean {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const caret = selection.getRangeAt(0);
  if (!caret.collapsed || !block.contains(caret.startContainer)) return false;
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(caret.startContainer, caret.startOffset);
  if (before.toString().replaceAll("​", "") !== "") return false;
  return !before
    .cloneContents()
    .querySelector("img, button, input, .te-track, .te-jsx-inline");
}

export function handleBackspace(editor: HTMLElement): boolean {
  const block = getCurrentBlock(editor);
  if (!block || !caretAtBlockStart(block)) return false;

  if (block.tagName === "PRE") {
    if ((block.textContent ?? "").replaceAll("\n", "") !== "") return false;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    block.replaceWith(paragraph);
    placeCaretAtStart(paragraph);
    return true;
  }

  if (/^H[1-3]$/.test(block.tagName)) {
    withCaret(block, () => retag(block, "p"));
    return true;
  }

  if (block.tagName === "LI") {
    if (block.classList.contains("te-task")) return false;
    withCaret(block, () => itemToParagraph(block));
    return true;
  }

  if (block.tagName !== "P") return false;

  if (
    block.classList.contains("te-arrow") ||
    block.classList.contains("te-chevron")
  ) {
    block.classList.remove("te-arrow", "te-chevron");
    if (!block.getAttribute("class")) block.removeAttribute("class");
    return true;
  }

  if (block.parentElement?.tagName === "BLOCKQUOTE") {
    withCaret(block, () => {
      liftOutOfQuote(block);
      return block;
    });
    return true;
  }

  const previous = block.previousElementSibling;
  if (previous?.tagName === "HR") {
    previous.remove();
    return true;
  }

  return false;
}

// ── Typography ──────────────────────────────────────────────────────────────

// `--` becomes an en dash and a third hyphen an em dash, as Writer displays
// them. Code stays literal, and a line of bare hyphens is left alone so `---`
// can still become a rule.
export function applyDashes(editor: HTMLElement): boolean {
  const range = editorRange(editor);
  if (!range?.collapsed) return false;
  const node = range.startContainer;
  if (!(node instanceof Text)) return false;
  const block = getCurrentBlock(editor, node);
  if (!block || block.tagName === "PRE") return false;
  if (closestWithin(node, "code", editor)) return false;

  const head = node.data.slice(0, range.startOffset);
  const dash = head.endsWith("–-") ? "—" : head.endsWith("--") ? "–" : null;
  if (!dash) return false;

  const lead = document.createRange();
  lead.selectNodeContents(block);
  lead.setEnd(node, range.startOffset);
  if (/^[\s\u200B-]*$/.test(lead.toString())) return false;

  const start = range.startOffset - 2;
  node.replaceData(start, 2, dash);
  const caret = document.createRange();
  caret.setStart(node, start + 1);
  caret.collapse(true);
  select(caret);
  return true;
}
