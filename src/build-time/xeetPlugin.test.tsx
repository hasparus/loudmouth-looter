import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Root } from "mdast";

import { altTextOf, xeetPlugin } from "./xeetPlugin";

const POST_URL = "https://x.com/jack/status/20";

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "xeet-plugin-"));
  const snapshotsDir = join(dir, "xeets");
  const rendersDir = join(dir, "renders");
  // A snapshot on disk keeps the plugin off the network.
  mkdirSync(snapshotsDir);
  writeFileSync(
    join(snapshotsDir, "20.json"),
    JSON.stringify({
      text: "just setting up my twttr",
      author: { name: "jack", handle: "jack" },
    }),
  );
  // The plugin doesn't use the processor it's called on.
  const transform = xeetPlugin.call(undefined as never, {
    snapshotsDir,
    rendersDir,
    component: "/Xeet.astro",
  }) as (tree: Root, file: { path: string }) => Promise<void>;
  return { rendersDir, transform };
}

type Node = Root["children"][number];

const paragraph = (...children: unknown[]) =>
  ({ type: "paragraph", children }) as Node;

const link = (url: string, text = url) => ({
  type: "link",
  url,
  children: [{ type: "text", value: text }],
});

const root = (...children: Node[]): Root => ({ type: "root", children });

describe("xeetPlugin", () => {
  test("replaces a paragraph with only an X post link", async () => {
    const { rendersDir, transform } = setup();
    const tree = root(paragraph(link(POST_URL)));

    await transform(tree, { path: "/posts/a.mdx" });

    const embed = tree.children.find(
      (node) => node.type === "mdxJsxFlowElement",
    ) as unknown as {
      name: string;
      attributes: { name: string; value: unknown }[];
    };
    expect(embed.name).toBe("XeetEmbed");
    const attrs = Object.fromEntries(
      embed.attributes.map((a) => [a.name, a.value]),
    );
    expect(attrs.url).toBe(POST_URL);
    expect(attrs.alt).toBe("jack (@jack) on X: just setting up my twttr");
    expect(Object.keys(attrs).sort()).toEqual(
      ["alt", "dark", "darkNarrow", "light", "lightNarrow", "url"].sort(),
    );

    const imports = tree.children.filter((node) => node.type === "mdxjsEsm");
    expect(imports).toHaveLength(5);
    expect(
      readdirSync(rendersDir).filter((f) => f.endsWith(".png")),
    ).toHaveLength(4);
  });

  test("leaves links inside sentences, other links and .md files alone", async () => {
    const { transform } = setup();
    const tree = root(
      paragraph({ type: "text", value: "See " }, link(POST_URL, "this")),
      paragraph(link("https://x.com/jack")),
    );
    const before = structuredClone(tree);

    await transform(tree, { path: "/posts/a.mdx" });
    expect(tree).toEqual(before);

    const md = root(paragraph(link(POST_URL)));
    const mdBefore = structuredClone(md);
    await transform(md, { path: "/posts/a.md" });
    expect(md).toEqual(mdBefore);
  });
});

describe("altTextOf", () => {
  test("describes media and quoted posts", () => {
    expect(
      altTextOf({
        text: "look",
        author: { name: "A", handle: "a" },
        media: [
          { kind: "image", width: 1, height: 1, alt: "a cat" },
          { kind: "video", width: 1, height: 1 },
        ],
        quote: { text: "hi", author: { handle: "b" } },
      }),
    ).toBe("A (@a) on X: look [image: a cat] [video] Quoting @b on X: hi");
  });
});
