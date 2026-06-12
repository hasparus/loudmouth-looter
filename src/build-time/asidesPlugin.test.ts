import { describe, expect, test } from "bun:test";
import type * as hast from "hast";
import type { MdxJsxFlowElementHast } from "mdast-util-mdx-jsx";

import { asidesPlugin,FLEX_CONTAINER_CLASS } from "./asidesPlugin";

function makeAside(
  children: MdxJsxFlowElementHast["children"] = [],
): MdxJsxFlowElementHast {
  return { type: "mdxJsxFlowElement", name: "aside", attributes: [], children };
}

function makeElement(tagName = "p"): hast.Element {
  return { type: "element", tagName, properties: {}, children: [] };
}

function runPlugin(children: hast.Root["children"]): hast.Root {
  const root: hast.Root = { type: "root", children };
  // @ts-expect-error — simplified root, no position info
  return asidesPlugin({})(root, {}, () => {});
}

describe("asidesPlugin", () => {
  test("aside after element sibling → wrapped in flex div", () => {
    const result = runPlugin([makeElement("p"), makeAside()]);
    expect(result.children).toHaveLength(1);
    const wrapper = result.children[0] as MdxJsxFlowElementHast;
    expect(wrapper.type).toBe("mdxJsxFlowElement");
    expect(wrapper.name).toBe("div");
    expect(wrapper.attributes[0]).toMatchObject({
      name: "className",
      value: FLEX_CONTAINER_CLASS,
    });
  });

  test("wrapper contains div-wrapped prev sibling + aside", () => {
    const result = runPlugin([makeElement("p"), makeAside()]);
    const wrapper = result.children[0] as MdxJsxFlowElementHast;
    expect(wrapper.children).toHaveLength(2);
    const [inner, aside] = wrapper.children as [hast.Element, MdxJsxFlowElementHast];
    expect(inner.type).toBe("element");
    expect(inner.tagName).toBe("div");
    expect(aside.type).toBe("mdxJsxFlowElement");
    expect(aside.name).toBe("aside");
  });

  test("aside with no prev sibling stays untouched", () => {
    const result = runPlugin([makeAside()]);
    expect(result.children).toHaveLength(1);
    const node = result.children[0] as MdxJsxFlowElementHast;
    expect(node.name).toBe("aside");
    expect(node.attributes).toHaveLength(0);
  });

  test("multiple elements before aside — prev sibling is immediate predecessor", () => {
    const first = makeElement("h2");
    const second = makeElement("p");
    const aside = makeAside();
    const result = runPlugin([first, second, aside]);
    expect(result.children).toHaveLength(2);
    const wrapper = result.children[1] as MdxJsxFlowElementHast;
    expect(wrapper.name).toBe("div");
  });
});
