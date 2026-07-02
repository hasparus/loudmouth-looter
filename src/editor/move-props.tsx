import type { Heading, RootContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";

export function slugFromTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[^\w]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function headingText(node: RootContent): string {
  if (node.type !== "heading") return "";
  return node.children
    .map((child) => ("value" in child ? child.value : ""))
    .join("");
}

function mdxAttribute(node: MdxJsxFlowElement, name: string): string | undefined {
  for (const attr of node.attributes) {
    if (attr.type === "mdxJsxAttribute" && attr.name === name) {
      return typeof attr.value === "string" ? attr.value : undefined;
    }
  }
  return undefined;
}

export function resolveMoveFromMdx(node: MdxJsxFlowElement): {
  title?: string;
  id?: string;
  body: RootContent[];
} {
  const attrTitle = mdxAttribute(node, "title");
  const attrId = mdxAttribute(node, "id");

  if (attrTitle) {
    return {
      title: attrTitle,
      id: attrId ?? slugFromTitle(attrTitle),
      body: [...node.children],
    };
  }

  const headingIndex = node.children.findIndex(
    (child): child is Heading => child.type === "heading",
  );
  if (headingIndex === -1) return { body: [...node.children] };

  const heading = node.children[headingIndex];
  if (heading?.type !== "heading") return { body: [...node.children] };

  const title = headingText(heading);
  if (!title) return { body: [...node.children] };

  return {
    title,
    id: attrId ?? slugFromTitle(title),
    body: node.children.filter((_, i) => i !== headingIndex),
  };
}
