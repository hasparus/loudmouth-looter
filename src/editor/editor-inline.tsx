// Inline Markdown typed into prose (`code`, **bold**, _italic_, *italic*,
// ~~strike~~, [links](url)) and its inverse.

import { escapeHtml, linkHtml, linkableHref } from "./editor-sanitize";
import { MARK_TAGS, markTag } from "./editor-schema";
import { getCurrentBlock, placeCaretAtEnd, setCaret } from "./editor-selection";

const CODE_SPAN = /`([^`]+)`/g;
// A label may hold one level of [brackets].
const LINK = /\[((?:[^[\]]|\[[^\]]*\])+)\]\(([^)\s]+)\)/g;
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

const hasInlineSyntax = (text: string) =>
  INLINE_SYNTAX.some((syntax) => syntax.test(text));

export function normalizeEditableText(text: string) {
  return text.replaceAll("\u200B", "").replaceAll(" ", " ");
}

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
      const href = linkableHref(url);
      return href ? hold(linkHtml(href, formatEmphasis(label))) : whole;
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

const MARK_SYNTAX: Readonly<Record<string, string>> = {
  I: "_",
  S: "~~",
  STRONG: "**",
};

// The inline Markdown that formatInline() turns back into `nodes` — what
// Mod-K writes out for a selection so the link rule can re-read it.
export function inlineMarkdown(nodes: Iterable<Node>): string {
  let out = "";
  for (const node of nodes) {
    if (node instanceof Text) {
      out += normalizeEditableText(node.data);
      continue;
    }
    if (!(node instanceof Element)) continue;
    const tag = markTag(node.tagName);
    if (tag === "BR") out += " ";
    else if (tag === "CODE") out += `\`${node.textContent}\``;
    else {
      const syntax = MARK_SYNTAX[tag] ?? "";
      out += syntax + inlineMarkdown(node.childNodes) + syntax;
    }
  }
  return out;
}

// ── Live transform ──────────────────────────────────────────────────────────

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
  if (!(marker.parentNode instanceof HTMLElement)) return;
  const boundary = document.createTextNode("\u200B");
  marker.replaceWith(boundary);
  setCaret(boundary, 1);
}

function transformInlineTextNodes(node: Node): boolean {
  if (node instanceof Text) {
    const raw = normalizeEditableText(node.textContent);
    if (!hasInlineSyntax(raw)) return false;

    const wrapper = document.createElement("span");
    wrapper.innerHTML = formatInline(raw);

    if (wrapper.textContent === raw && wrapper.children.length === 0)
      return false;

    node.replaceWith(...wrapper.childNodes);
    return true;
  }

  if (!(node instanceof HTMLElement)) return false;
  if (node.dataset.caretMarker === "true") return false;
  if (MARK_TAGS.has(node.tagName)) return false;

  let changed = false;
  for (const child of [...node.childNodes]) {
    changed = transformInlineTextNodes(child) || changed;
  }
  return changed;
}

function absorbTrailingPunctuation(block: HTMLElement) {
  let changed = false;

  for (const child of [...block.childNodes]) {
    if (!(child instanceof HTMLElement)) continue;
    const mark = markTag(child.tagName);
    if (mark !== "STRONG" && mark !== "I") continue;

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

export function applyInlineTransform(root: HTMLElement) {
  const block = getCurrentBlock(root);
  if (!block || (block.tagName === "LI" && block.closest("ul, ol") === null))
    return;

  if (hasInlineSyntax(normalizeEditableText(block.textContent))) {
    const marker = insertCaretMarker(root);
    const changed = transformInlineTextNodes(block);

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
