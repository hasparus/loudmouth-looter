import type * as hast from "hast";
import type { MdxJsxFlowElementHast } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

export const FLEX_CONTAINER_CLASS = "zaduma-aside";

export type AsidesPluginOptions = {};

/**
 * Wraps `aside` elements with previous sibling in a flex container.
 *
 * Read posts/features/asides.mdx for more information.
 *
 * Types come from hast, augmented by `mdast-util-mdx-jsx` to know
 * `mdxJsxFlowElement` — keep this in sync with moveCardPlugin's typing.
 */
export const asidesPlugin: Plugin<
  [AsidesPluginOptions],
  hast.Root,
  hast.Root
> = (_options) => {
  return (root) => {
    let children = [...root.children];

    const childrenToRemove = new Set<hast.RootContent>();

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (!node) continue;
      if (node.type === "mdxJsxFlowElement" && node.name === "aside") {
        let lastAsideIndex = 0;
        for (let j = i - 1; j >= lastAsideIndex; j--) {
          const prev = children[j];
          if (!prev) continue;
          if (prev.type === "element") {
            childrenToRemove.add(node);
            lastAsideIndex = i;

            const wrapper: MdxJsxFlowElementHast = {
              type: "mdxJsxFlowElement",
              name: "div",
              position: prev.position,
              data: prev.data,
              attributes: [
                {
                  type: "mdxJsxAttribute",
                  name: "className",
                  value: FLEX_CONTAINER_CLASS,
                },
              ],
              children: [
                {
                  type: "element",
                  tagName: "div",
                  children: [prev],
                  properties: {},
                },
                node,
              ],
            };
            children[j] = wrapper;

            break;
          }
        }
      }
    }

    children = children.filter((node) => !childrenToRemove.has(node));

    return { ...root, children };
  };
};
