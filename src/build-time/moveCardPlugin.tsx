import type { Root } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { resolveMoveFromMdx, slugFromTitle } from "../editor/move-props";

export const moveCardPlugin: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "mdxJsxFlowElement", (node: MdxJsxFlowElement) => {
      if (node.name !== "Move") return;

      const resolved = resolveMoveFromMdx(node);
      if (!resolved.title) return;

      if (!hasAttribute(node, "title"))
        setAttribute(node, "title", resolved.title);
      if (!hasAttribute(node, "id"))
        setAttribute(node, "id", resolved.id ?? slugFromTitle(resolved.title));

      const headingIndex = node.children.findIndex(
        (child) => child.type === "heading",
      );
      if (headingIndex !== -1) node.children.splice(headingIndex, 1);
    });
  };
};

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

