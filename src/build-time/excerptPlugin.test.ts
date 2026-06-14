import { compile } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { VFile } from "vfile";

import { recmaMdxExcerpt } from "./excerptPlugin";

/**
 * Compile MDX the way Astro does (lowered `_jsx` calls) with our plugin.
 * `frontmatter` is placed on `file.data.astro.frontmatter`, where Astro puts it.
 */
async function excerptOf(
  src: string,
  frontmatter?: Record<string, unknown>,
): Promise<string | null> {
  const file = new VFile({
    value: src,
    data: frontmatter ? { astro: { frontmatter } } : {},
  });
  const out = await compile(file, {
    jsxImportSource: "astro",
    recmaPlugins: [recmaMdxExcerpt],
  });
  const match = /export function Excerpt[\s\S]*$/.exec(String(out.value));
  return match ? match[0] : null;
}

describe("recmaMdxExcerpt", () => {
  test("picks the first two blocks", async () => {
    const code = await excerptOf(
      `First paragraph.\n\n> A blockquote.\n\nThird paragraph (over budget).`,
    );
    expect(code).toContain("First paragraph.");
    expect(code).toContain("A blockquote.");
    expect(code).not.toContain("over budget");
  });

  test("stops the lede at the first heading", async () => {
    const code = await excerptOf(
      `Lede paragraph.\n\n## Heading\n\nBody paragraph.`,
    );
    expect(code).toContain("Lede paragraph.");
    expect(code).not.toContain("Body paragraph.");
  });

  test("skips a leading heading and keeps the paragraphs after it", async () => {
    const code = await excerptOf(`# Title\n\nReal opening.\n\nSecond.`);
    expect(code).toContain("Real opening.");
    expect(code).toContain("Second.");
  });

  test("respects excerpt.blocks frontmatter", async () => {
    const src = `One.\n\nTwo.\n\nThree.\n\nFour.`;
    const code = await excerptOf(src, { excerpt: { blocks: 3 } });
    expect(code).toContain("Three.");
    expect(code).not.toContain("Four.");
  });

  test("keeps editor atoms in the lede instead of skipping them", async () => {
    const code = await excerptOf(
      `<Track title="x">x</Track>\n\nIntro paragraph.`,
    );
    expect(code).toContain("Track");
    expect(code).toContain("Intro paragraph.");
  });

  test("resolves reference-style links in the excerpt", async () => {
    const code = await excerptOf(`See the [docs][d].\n\n[d]: /docs`);
    expect(code).toContain('"/docs"');
  });

  test("reuses the post's component map (_components.*)", async () => {
    const code = await excerptOf(`Just a paragraph.`);
    expect(code).toContain("_components.p");
  });

  test("emits no Excerpt when nothing precedes the first heading", async () => {
    const code = await excerptOf(`## Heading only\n\n### Another`);
    expect(code).toBeNull();
  });
});
