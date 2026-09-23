import type { Nodes } from "mdast";

import { sanitizeImageSrc, sanitizeUrl } from "./editor-sanitize";
import { editorMdxTreeToHtml, parseEditorMdx } from "./editor-mdx";

function sourceFor(node: Nodes, source: string): string {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start == null || end == null ? "" : source.slice(start, end);
}

function supported(node: Nodes): boolean {
  switch (node.type) {
    case "root":
    case "paragraph":
    case "emphasis":
    case "strong":
      return node.children.every(supported);
    case "heading":
      return node.depth <= 2 && node.children.every(supported);
    case "list":
      return (
        !node.spread &&
        (!node.ordered || node.start == null || node.start === 1) &&
        node.children.every(supported)
      );
    case "listItem":
      return (
        !node.spread &&
        node.children.length === 1 &&
        node.children[0]?.type === "paragraph" &&
        supported(node.children[0])
      );
    case "link":
      return (
        !node.title && !!sanitizeUrl(node.url) && node.children.every(supported)
      );
    case "image":
      return !node.title && !!sanitizeImageSrc(node.url);
    case "text":
      return !node.value.includes("\n");
    case "break":
      return true;
    default:
      return false;
  }
}

function containsSyntax(node: Nodes, source: string): boolean {
  switch (node.type) {
    case "heading":
    case "list":
    case "emphasis":
    case "strong":
    case "image":
    case "break":
      return true;
    case "link": {
      const raw = sourceFor(node, source).trimStart();
      return raw.startsWith("[") || raw.startsWith("<");
    }
    default:
      return "children" in node
        ? node.children.some((child) => containsSyntax(child, source))
        : false;
  }
}

export function markdownPasteHtml(
  source: string,
  explicit = false,
): { html: string; inline: boolean } | null {
  const trailingLine = source.replace(/\r?\n$/, "");
  if (
    !source.trim() ||
    source !== source.trimStart() ||
    trailingLine !== trailingLine.trimEnd()
  )
    return null;
  try {
    const tree = parseEditorMdx(source);
    if (!supported(tree) || (!explicit && !containsSyntax(tree, source)))
      return null;
    return {
      html: editorMdxTreeToHtml(tree, source),
      inline:
        tree.children.length === 1 && tree.children[0]?.type === "paragraph",
    };
  } catch {
    return null;
  }
}

const THIN_WRAPPER_TAGS = new Set(["BR", "DIV", "P", "SPAN"]);

function wrapperText(parent: ParentNode): string {
  let text = "";
  for (const child of parent.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child instanceof Element) {
      if (child.tagName === "BR") {
        text += "\n";
      } else if (child.tagName === "DIV" || child.tagName === "P") {
        const inside = wrapperText(child);
        text += (inside === "\n" ? "" : inside) + "\n";
      } else {
        text += wrapperText(child);
      }
    }
  }
  return text;
}

export function htmlIsThinTextWrapper(html: string, text: string): boolean {
  if (!html) return true;

  const template = document.createElement("template");
  template.innerHTML = html;

  for (const element of template.content.querySelectorAll("*")) {
    if (!THIN_WRAPPER_TAGS.has(element.tagName)) return false;
    if (
      (element.tagName === "P" || element.tagName === "DIV") &&
      !element.textContent?.trim()
    )
      return false;
    for (const attribute of element.attributes) {
      if (attribute.name !== "class" && attribute.name !== "style")
        return false;
    }
  }

  const htmlText = wrapperText(template.content).replaceAll(/\r\n?/g, "\n");
  const plainText = text.replaceAll(/\r\n?/g, "\n");
  return htmlText.replace(/\n$/, "") === plainText;
}
