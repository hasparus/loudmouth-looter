import type { Nodes, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const detector = unified().use(remarkParse).use(remarkGfm);
const THIN_WRAPPER_TAGS = new Set(["BR", "DIV", "P", "SPAN"]);

const UNSUPPORTED_BLOCK_TYPES = new Set([
  "blockquote",
  "code",
  "table",
  "thematicBreak",
]);

function sourceFor(node: Nodes, source: string) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start == null || end == null ? "" : source.slice(start, end);
}

function childrenOf(node: Nodes): Nodes[] {
  return "children" in node ? (node.children as Nodes[]) : [];
}

function containsUnsupportedBlock(node: Nodes): boolean {
  if (UNSUPPORTED_BLOCK_TYPES.has(node.type)) return true;
  return childrenOf(node).some(containsUnsupportedBlock);
}

function containsMarkdownSyntax(node: Nodes, source: string): boolean {
  switch (node.type) {
    case "heading":
      return node.depth <= 2;
    case "strong":
    case "emphasis":
    case "image":
    case "break":
      return true;
    case "link": {
      const raw = sourceFor(node, source).trimStart();
      return raw.startsWith("[") || raw.startsWith("<");
    }
    case "list":
      return node.children.length > 0;
    default:
      return childrenOf(node).some((child) =>
        containsMarkdownSyntax(child, source),
      );
  }
}

/**
 * Whether plain text contains Markdown syntax the editor can preserve.
 *
 * Markdown accepts ordinary prose, so parsing successfully is not enough.
 * We inspect the parsed tree for deliberate formatting and reject block types
 * that the editor would currently flatten or discard.
 */
export function looksLikeSupportedMarkdown(source: string): boolean {
  if (!source.trim()) return false;

  let tree: Root;
  try {
    tree = detector.parse(source);
  } catch {
    return false;
  }

  if (containsUnsupportedBlock(tree)) return false;
  return containsMarkdownSyntax(tree, source);
}

function normalizedText(text: string) {
  return text.replaceAll(/\s/g, "");
}

/**
 * Rich HTML should retain its formatting. Some clipboard producers, however,
 * put Markdown source in text/html wrapped only in layout spans and divs.
 */
export function htmlIsThinTextWrapper(html: string, text: string): boolean {
  if (!html) return true;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const element of template.content.querySelectorAll("*")) {
    if (!THIN_WRAPPER_TAGS.has(element.tagName)) return false;
    for (const attribute of element.attributes) {
      if (attribute.name !== "class" && attribute.name !== "style")
        return false;
    }
  }

  return (
    normalizedText(template.content.textContent ?? "") === normalizedText(text)
  );
}

export function shouldPasteAsMarkdown(text: string, html: string): boolean {
  return looksLikeSupportedMarkdown(text) && htmlIsThinTextWrapper(html, text);
}
