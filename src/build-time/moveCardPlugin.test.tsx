import { describe, expect, test } from "bun:test";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";

import { moveCardPlugin } from "./moveCardPlugin";

function makeMove(
  children: MdxJsxFlowElement["children"],
  attrs: MdxJsxFlowElement["attributes"] = [],
): MdxJsxFlowElement {
  return {
    type: "mdxJsxFlowElement",
    name: "Move",
    attributes: attrs,
    children,
  };
}

function runPlugin(node: MdxJsxFlowElement) {
  const tree = { type: "root" as const, children: [node] };
  // @ts-expect-error — simplified tree, no position info needed
  void moveCardPlugin()(tree, {}, () => {});
  return tree.children[0]!;
}

function attr(node: MdxJsxFlowElement, name: string) {
  return node.attributes.find(
    (a) => a.type === "mdxJsxAttribute" && a.name === name,
  );
}

describe("moveCardPlugin", () => {
  test("lifts heading to title and id, removes it from children", () => {
    const node = makeMove([
      {
        type: "heading",
        depth: 2,
        children: [{ type: "text", value: "Iron Cross" }],
      },
      { type: "paragraph", children: [{ type: "text", value: "Rules." }] },
    ]);
    const result = runPlugin(node);
    expect(attr(result, "title")?.value).toBe("Iron Cross");
    expect(attr(result, "id")?.value).toBe("iron-cross");
    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.type).toBe("paragraph");
  });

  test("slug handles spaces and special chars", () => {
    const node = makeMove([
      {
        type: "heading",
        depth: 2,
        children: [{ type: "text", value: "Back Lever!" }],
      },
    ]);
    const result = runPlugin(node);
    expect(attr(result, "id")?.value).toBe("back-lever");
  });

  test("does not overwrite existing title attribute", () => {
    const node = makeMove(
      [
        {
          type: "heading",
          depth: 2,
          children: [{ type: "text", value: "New Heading" }],
        },
      ],
      [{ type: "mdxJsxAttribute", name: "title", value: "Existing" }],
    );
    const result = runPlugin(node);
    expect(attr(result, "title")?.value).toBe("Existing");
  });

  test("no-heading Move left untouched", () => {
    const node = makeMove([
      { type: "paragraph", children: [{ type: "text", value: "No heading." }] },
    ]);
    const result = runPlugin(node);
    expect(result.attributes).toHaveLength(0);
    expect(result.children).toHaveLength(1);
  });

  test("non-Move elements are not transformed", () => {
    const nonMove: MdxJsxFlowElement = {
      type: "mdxJsxFlowElement",
      name: "Line",
      attributes: [],
      children: [
        {
          type: "heading",
          depth: 2,
          children: [{ type: "text", value: "Should stay" }],
        },
      ],
    };
    const tree = { type: "root" as const, children: [nonMove] };
    // @ts-expect-error — simplified tree
    void moveCardPlugin()(tree, {}, () => {});
    expect(tree.children[0]!.attributes).toHaveLength(0);
  });
});
