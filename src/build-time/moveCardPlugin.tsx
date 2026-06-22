import type { Root } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// `<Move>` in a post wraps a heading + the move's rules. Lift that first
// heading out of the body and onto the element as `title`/`id` so it maps to
// render/Move.astro (the MoveCard) — title becomes the card's heading, id its
// anchor. Authoring stays plain: write `## Name` inside `<Move>`, get a card.
export const moveCardPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== "Move") return;

      const headingIndex = node.children.findIndex(
        (child) => child.type === "heading",
      );
      if (headingIndex === -1) return;

      const title = nodeText(node.children[headingIndex]);
      if (!title) return;

      if (!hasAttribute(node, "title")) setAttribute(node, "title", title);
      if (!hasAttribute(node, "id")) setAttribute(node, "id", slug(title));
      node.children.splice(headingIndex, 1);
    });
  };
};

function nodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  if ("value" in node && typeof node.value === "string") return node.value;
  if ("children" in node && Array.isArray(node.children))
    return node.children.map(nodeText).join("");
  return "";
}

function hasAttribute(node: MdxJsxFlowElement, name: string): boolean {
  return node.attributes.some(
    (attr) => attr.type === "mdxJsxAttribute" && attr.name === name,
  );
}

function setAttribute(
  node: MdxJsxFlowElement,
  name: string,
  value: string,
): void {
  const attribute: MdxJsxAttribute = { type: "mdxJsxAttribute", name, value };
  node.attributes.push(attribute);
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
