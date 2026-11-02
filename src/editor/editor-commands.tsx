// Every edit the editor makes on request — keyboard shortcuts, the Enter /
// Backspace / Tab rules, slash-menu blocks — as one command type with one
// dispatcher. Commands mutate the DOM and report whether they did anything;
// the caller snapshots for undo and saves.

import { buildToggleElement } from "./editor-atoms";
import {
  codeBlockKey,
  currentCodeBlock,
  literalContextAt,
  replaceOrPrecede,
  replaceWithCodeBlock,
} from "./editor-code-block";
import {
  handleEnter,
  insertRule,
  liftOutOfQuote,
  trackBeforeCaret,
} from "./editor-dom";
import { inlineMarkdown } from "./editor-inline";
import { buildLink, linkableUrl } from "./editor-sanitize";
import { HEADING_TAGS, MARK_TAGS, TEXT_BLOCK_TAGS } from "./editor-schema";
import {
  caretAfter,
  closestWithin,
  editorRange,
  getCurrentBlock,
  placeCaretAtStart,
  select,
  setCaret,
  withCaret,
} from "./editor-selection";
import { buildMoveElement } from "./move-dom";

export type BlockType = "h1" | "h2" | "h3" | "p";
export type ListKind = "ol" | "task" | "ul";
export type LineClass = "te-arrow" | "te-chevron";

export type EditorCommand =
  // Key rules: they apply only in some places, and otherwise leave the key
  // to the browser.
  | { kind: "backspace" }
  | { kind: "enter" }
  | { kind: "indent" }
  // Shortcuts and slash-menu blocks.
  | { kind: "block"; type: BlockType }
  | { kind: "code" }
  | { kind: "code-block" }
  | { kind: "ignore" }
  | { kind: "line"; line: LineClass }
  | { kind: "link" }
  | { kind: "list"; list: ListKind }
  | { kind: "move" }
  | { kind: "native"; name: "bold" | "italic" | "strikeThrough" }
  | { kind: "paragraph-below" }
  | { kind: "quote" }
  | { kind: "rule" };

export const isKeyRule = (command: EditorCommand) =>
  command.kind === "backspace" ||
  command.kind === "enter" ||
  command.kind === "indent";

const BLOCK_TYPES: BlockType[] = ["p", "h1", "h2", "h3"];

// Shortcuts follow Writer (and most Markdown editors): Mod-B/I/E/K,
// Mod-Shift-X, Mod-Alt-0…3, Mod-Shift-7/8/9/., Mod-Shift-Enter, Mod-Enter.
export function commandForKey(event: KeyboardEvent): EditorCommand | null {
  const key = event.key.toLowerCase();
  if (!event.metaKey && !event.ctrlKey) {
    if (key === "enter") return { kind: "enter" };
    if (event.altKey || event.shiftKey) return null;
    if (key === "backspace") return { kind: "backspace" };
    if (key === "tab") return { kind: "indent" };
    return null;
  }

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

export function runCommand(
  editor: HTMLElement,
  command: EditorCommand,
): boolean {
  // Code is literal. A code block takes only its own keys, the way out and
  // being quoted; an inline code span takes everything but marks and links.
  const literal = literalContextAt(editor);
  const pre = literal === "pre" ? currentCodeBlock(editor) : null;
  if (pre) {
    switch (command.kind) {
      case "backspace":
      case "enter":
      case "indent":
        return codeBlockKey(pre, command.kind);
      case "paragraph-below":
        return insertParagraphBelow(editor);
      case "quote":
        return toggleQuote(editor);
      default:
        return false;
    }
  }
  if (
    literal === "code" &&
    (command.kind === "native" || command.kind === "link")
  )
    return false;

  switch (command.kind) {
    case "backspace":
      return handleBackspace(editor);
    case "block":
      return setBlockType(editor, command.type);
    case "code":
      return toggleInlineCode(editor);
    case "code-block":
      return withBlock(editor, (block) => replaceWithCodeBlock(block, ""));
    case "enter":
      return handleEnter(editor);
    case "ignore":
    case "indent":
      return false;
    case "line":
      return setLine(editor, command.line);
    case "link":
      return toggleLink(editor);
    case "list":
      return toggleList(editor, command.list);
    case "move":
      return withBlock(editor, insertMove);
    case "native":
      // The browser's own commands toggle marks across partial selections and
      // land on its native undo stack.
      return document.execCommand(command.name);
    case "paragraph-below":
      return insertParagraphBelow(editor);
    case "quote":
      return toggleQuote(editor);
    case "rule":
      return withBlock(editor, insertRule);
  }
}

function withBlock(
  editor: HTMLElement,
  edit: (block: HTMLElement) => boolean,
): boolean {
  const block = getCurrentBlock(editor);
  return !!block && edit(block);
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
  if (!block) return null;
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
    element.textContent = span.toString().replaceAll("\u200B", "");
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

  element.textContent = "\u200B";
  target.range.insertNode(element);
  element.after(document.createTextNode("\u200B"));
  setCaret(element.firstChild!, 1);
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

  const url = linkableUrl(span.toString());
  if (url) {
    const anchor = buildLink(url, span.extractContents());
    span.insertNode(anchor);
    caretAfter(anchor);
    return true;
  }

  // Only text and marks can be written out as a label; anything else (an
  // image, a track) would be lost.
  const contents = span.cloneContents();
  const hasAtom = [...contents.querySelectorAll("*")].some(
    (element) => !MARK_TAGS.has(element.tagName) && element.tagName !== "BR",
  );
  if (hasAtom) return false;
  const label = inlineMarkdown(contents.childNodes).trim();
  if (!label) return false;
  const markdown = document.createTextNode(`[${label}](`);
  span.deleteContents();
  span.insertNode(markdown);
  setCaret(markdown, markdown.length);
  return true;
}

// ── Blocks ──────────────────────────────────────────────────────────────────

export function setBlockType(editor: HTMLElement, type: BlockType): boolean {
  const block = getCurrentBlock(editor);
  if (!block || !TEXT_BLOCK_TAGS.has(block.tagName)) return false;
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
  if (!block) return false;
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

  if (!TEXT_BLOCK_TAGS.has(block.tagName)) return false;
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

function setLine(editor: HTMLElement, line: LineClass): boolean {
  const block = getCurrentBlock(editor);
  if (block?.tagName !== "P") return false;
  block.classList.remove("te-arrow", "te-chevron");
  block.classList.add(line);
  return true;
}

function insertMove(block: HTMLElement): boolean {
  const body = document.createElement("p");
  body.innerHTML = "<br>";
  const move = buildMoveElement("New Move", undefined, [body]);
  replaceOrPrecede(block, move);
  const title = move.querySelector("h3");
  const caret = document.createRange();
  caret.selectNodeContents(title ?? body);
  if (!title) caret.collapse(true);
  select(caret);
  return true;
}

// Mod-Enter: a fresh paragraph below the current block (or its list, quote or
// code block) — the way out of anything.
export function insertParagraphBelow(editor: HTMLElement): boolean {
  const block = getCurrentBlock(editor);
  if (!block) return false;
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  blockUnit(block).after(paragraph);
  liftOutOfQuote(paragraph);
  placeCaretAtStart(paragraph);
  return true;
}

// ── Backspace at the start of a block: undo the block's formatting first ──

// At the start of the block's text — after a checklist item's own toggle.
function caretAtBlockStart(block: HTMLElement): boolean {
  const selection = globalThis.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const caret = selection.getRangeAt(0);
  if (!caret.collapsed || !block.contains(caret.startContainer)) return false;
  const before = document.createRange();
  before.selectNodeContents(block);
  const toggle = block.querySelector(":scope > .te-toggle");
  if (toggle) before.setStartAfter(toggle);
  before.setEnd(caret.startContainer, caret.startOffset);
  if (before.toString().replaceAll("\u200B", "") !== "") return false;
  return !before
    .cloneContents()
    .querySelector("img, button, input, .te-track, .te-jsx-inline");
}

export function handleBackspace(editor: HTMLElement): boolean {
  // Right after a track, Backspace drops its last toggle (keeping one).
  const toggles = trackBeforeCaret(editor)?.querySelectorAll(".te-toggle");
  if (toggles && toggles.length > 1) {
    [...toggles].at(-1)?.remove();
    return true;
  }

  const block = getCurrentBlock(editor);
  if (!block || !caretAtBlockStart(block)) return false;

  if (HEADING_TAGS.has(block.tagName)) {
    withCaret(block, () => retag(block, "p"));
    return true;
  }

  if (block.tagName === "LI") {
    // A checklist item becomes a bullet first, then a paragraph.
    withCaret(block, () => {
      if (!block.classList.contains("te-task")) return itemToParagraph(block);
      setTask(block, false);
      return block;
    });
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
// them. (Callers skip code.) A line of bare hyphens is left alone so `---`
// can still become a rule, and so is anything typed into a URL.
export function applyDashes(editor: HTMLElement): boolean {
  const range = editorRange(editor);
  if (!range?.collapsed) return false;
  const node = range.startContainer;
  if (!(node instanceof Text)) return false;
  const block = getCurrentBlock(editor, node);
  if (!block) return false;

  const head = node.data.slice(0, range.startOffset);
  const dash = head.endsWith("–-") ? "—" : head.endsWith("--") ? "–" : null;
  if (!dash) return false;
  const word = head.slice(head.search(/\S*$/));
  if (/:\/\/|\]\(/.test(word)) return false;

  const lead = document.createRange();
  lead.selectNodeContents(block);
  lead.setEnd(node, range.startOffset);
  if (/^[\s\u200B-]*$/.test(lead.toString())) return false;

  const start = range.startOffset - 2;
  node.replaceData(start, 2, dash);
  setCaret(node, start + 1);
  return true;
}
