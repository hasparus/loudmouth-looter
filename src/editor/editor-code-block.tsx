// Code is literal. Inside a code block or an inline code span the prose
// rules (inline Markdown, dashes, slash menu, rich paste, formatting
// commands) don't apply. Callers check literalContextAt() once per entry
// point and hand code blocks to this module.
//
// A code block is a <pre> holding one text node that always ends in a "\n"
// sentinel, so an empty last line has height (the serializer drops it).

import {
  closestWithin,
  editorRange,
  placeCaretAtStart,
  select,
  setCaret,
} from "./editor-selection";

export type LiteralContext = "code" | "pre";

export function literalContextAt(editor: HTMLElement): LiteralContext | null {
  const anchor = editorRange(editor)?.startContainer ?? null;
  if (closestWithin(anchor, "pre", editor)) return "pre";
  if (closestWithin(anchor, "code", editor)) return "code";
  return null;
}

export function currentCodeBlock(editor: HTMLElement): HTMLElement | null {
  return closestWithin(
    editorRange(editor)?.startContainer ?? null,
    "pre",
    editor,
  );
}

function paragraphAfter(element: Element) {
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  element.after(paragraph);
  return paragraph;
}

export function replaceWithCodeBlock(block: HTMLElement, lang: string) {
  const pre = document.createElement("pre");
  if (lang) pre.dataset.lang = lang;
  pre.textContent = "\n";
  block.replaceWith(pre);
  if (!pre.nextElementSibling) paragraphAfter(pre);
  placeCaretAtStart(pre);
  return true;
}

function splitAtCaret(pre: HTMLElement) {
  const range = editorRange(pre);
  if (!range) return null;
  range.deleteContents();
  const before = document.createRange();
  before.selectNodeContents(pre);
  before.setEnd(range.startContainer, range.startOffset);
  const head = before.toString();
  return { head, tail: (pre.textContent ?? "").slice(head.length) };
}

function insertText(pre: HTMLElement, text: string) {
  const split = splitAtCaret(pre);
  if (!split) return false;
  let next = split.head + text + split.tail;
  if (!next.endsWith("\n")) next += "\n";
  pre.textContent = next;
  if (pre.firstChild) setCaret(pre.firstChild, split.head.length + text.length);
  return true;
}

// Enter inserts a newline; Enter on an empty last line leaves the block.
function enter(pre: HTMLElement) {
  const split = splitAtCaret(pre);
  if (!split) return false;
  if (split.head.endsWith("\n") && (split.tail === "" || split.tail === "\n")) {
    pre.textContent = split.head;
    placeCaretAtStart(paragraphAfter(pre));
    return true;
  }
  return insertText(pre, "\n");
}

// Backspace in an empty block turns it back into a paragraph; elsewhere the
// browser deletes a character.
function backspace(pre: HTMLElement) {
  if ((pre.textContent ?? "").replaceAll("\n", "") !== "") return false;
  const paragraph = document.createElement("p");
  paragraph.innerHTML = "<br>";
  pre.replaceWith(paragraph);
  placeCaretAtStart(paragraph);
  return true;
}

export type CodeBlockKey = "backspace" | "enter" | "indent";

export function codeBlockKey(pre: HTMLElement, key: CodeBlockKey): boolean {
  switch (key) {
    case "backspace":
      return backspace(pre);
    case "enter":
      return enter(pre);
    case "indent":
      return insertText(pre, "  ");
  }
}

// Paste into code: plain text only — newlines kept in a block, collapsed in
// an inline span.
export function pasteLiteral(
  editor: HTMLElement,
  context: LiteralContext,
  text: string,
): boolean {
  if (context === "pre") {
    const pre = currentCodeBlock(editor);
    return !!pre && insertText(pre, text.replaceAll(/\r\n?/g, "\n"));
  }
  const range = editorRange(editor);
  if (!range) return false;
  range.deleteContents();
  const node = document.createTextNode(text.replaceAll(/\s+/g, " "));
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  select(range);
  return true;
}
