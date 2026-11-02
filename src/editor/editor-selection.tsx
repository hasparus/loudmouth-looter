// Caret and range plumbing shared by every editing path.

import { CARET_BLOCK_TAGS } from "./editor-schema";

export function select(range: Range) {
  const selection = globalThis.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function placeCaret(element: HTMLElement, atStart: boolean) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(atStart);
  select(range);
}

export const placeCaretAtStart = (element: HTMLElement) =>
  placeCaret(element, true);
export const placeCaretAtEnd = (element: HTMLElement) =>
  placeCaret(element, false);

export function setCaret(node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  select(range);
}

// A zero-width boundary just outside `node`, so typing continues outside it
// (serializeDocument strips it).
export function caretAfter(node: Node) {
  const boundary = document.createTextNode("\u200B");
  node.parentNode?.insertBefore(boundary, node.nextSibling);
  setCaret(boundary, 1);
}

// The selection's range, if it is inside `editor`.
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

// The block the caret is editing in. A Move card's title is laid out by the
// card, not edited as prose.
export function getCurrentBlock(
  root: HTMLElement,
  anchor: Node | null = globalThis.getSelection()?.anchorNode ?? null,
): HTMLElement | null {
  if (!anchor || !root.contains(anchor)) return null;

  for (let node: Node | null = anchor; node && node !== root; ) {
    if (node instanceof HTMLElement && CARET_BLOCK_TAGS.has(node.tagName))
      return "moveTitle" in node.dataset ? null : node;
    node = node.parentNode;
  }
  return null;
}

// ── Caret as a text offset ──────────────────────────────────────────────────
// Edits that move or rebuild a block lose the live selection; they record the
// caret as a text offset into the block and restore it afterwards.

export function caretOffset(block: HTMLElement): number | null {
  const range = editorRange(block);
  if (!range) return null;
  const before = document.createRange();
  before.selectNodeContents(block);
  before.setEnd(range.startContainer, range.startOffset);
  return before.toString().length;
}

export function restoreCaret(block: HTMLElement, offset: number | null) {
  let remaining = offset ?? 0;
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(offset === null);
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      range.setStart(node, remaining);
      range.collapse(true);
      break;
    }
    remaining -= length;
  }
  select(range);
}

// Runs `move`, which returns the element now holding the caret's text, and
// puts the caret back at the same offset in it.
export function withCaret(block: HTMLElement, move: () => HTMLElement) {
  const offset = caretOffset(block);
  restoreCaret(move(), offset);
}

// ── Caret as a node path (undo snapshots) ───────────────────────────────────

export type SelectionPath = { offset: number; path: number[] } | null;

export function captureSelection(root: HTMLElement): SelectionPath {
  const range = editorRange(root);
  if (!range || !root.contains(range.startContainer)) return null;

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

export function restoreSelection(root: HTMLElement, snapshot: SelectionPath) {
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
  setCaret(node, Math.min(snapshot.offset, limit));
}
