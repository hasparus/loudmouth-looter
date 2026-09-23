import { describe, expect, test } from "bun:test";

import { htmlToMdx } from "./editor-mdx";
import {
  htmlIsThinTextWrapper,
  markdownPasteHtml,
} from "./editor-markdown-paste";

describe("markdownPasteHtml", () => {
  test.each([
    ["# Heading", "<h1>Heading</h1>"],
    ["## Heading", "<h2>Heading</h2>"],
    ["**bold**", "<p><strong>bold</strong></p>"],
    ["_italic_", "<p><i>italic</i></p>"],
    [
      "[label](https://example.com)",
      '<p><a href="https://example.com">label</a></p>',
    ],
    [
      "![alt](https://example.com/image.png)",
      '<p><img src="https://example.com/image.png" alt="alt"></p>',
    ],
    ["- one\n- two", "<ul><li>one</li><li>two</li></ul>"],
    ["1. one\n2. two", "<ol><li>one</li><li>two</li></ol>"],
  ])("converts supported Markdown: %s", (source, html) => {
    expect(markdownPasteHtml(source)?.html).toBe(html);
  });

  test("preserves a task through the file serializer", () => {
    const result = markdownPasteHtml("- [ ] todo");
    expect(result).not.toBeNull();
    expect(htmlToMdx(result!.html)).toBe("- [ ] todo\n");
  });

  test("distinguishes inline paragraphs from blocks", () => {
    expect(markdownPasteHtml("A **bold** word")?.inline).toBe(true);
    expect(markdownPasteHtml("# Heading")?.inline).toBe(false);
  });

  test.each([
    "",
    "Ordinary prose.",
    "First line\nSecond line",
    "https://example.com",
    "#hashtag",
    "> a quote",
    "```ts\nconst answer = 42;\n```",
    "| A | B |\n| - | - |\n| 1 | 2 |",
    "### unsupported heading depth",
    "## Good\n\n### Important",
    "- parent\n  - child",
    "10. tenth\n11. eleventh",
    "**bold** ~~deleted~~",
    "**bold** `inline code`",
    "**bold**\n\n",
    " **bold**",
    "**bold**  ",
    '[example](https://example.com "important tooltip")',
    '![image](https://example.com/x.png "caption")',
    "- first\n\n- second",
    "**bold**\n\na | b\n--- | ---\n1 | 2",
  ])("rejects plain or lossy Markdown: %s", (source) => {
    expect(markdownPasteHtml(source)).toBeNull();
  });

  test("explicit Markdown allows plain prose, but not lossy blocks", () => {
    expect(markdownPasteHtml("Ordinary prose.", true)?.html).toBe(
      "<p>Ordinary prose.</p>",
    );
    expect(
      markdownPasteHtml("# Heading\n\n| A | B |\n| - | - |", true),
    ).toBeNull();
  });
});

describe("htmlIsThinTextWrapper", () => {
  test("accepts absent HTML and layout-only wrappers with matching line breaks", () => {
    expect(htmlIsThinTextWrapper("", "**bold**")).toBe(true);
    expect(
      htmlIsThinTextWrapper(
        '<div class="line"><span style="color:red">**bold**</span></div>',
        "**bold**",
      ),
    ).toBe(true);
    expect(
      htmlIsThinTextWrapper(
        "<div>## Heading\n\n**bold**</div>",
        "## Heading\n\n**bold**",
      ),
    ).toBe(true);
  });

  test("rejects semantic rich HTML and editor metadata", () => {
    expect(htmlIsThinTextWrapper("<p><strong>bold</strong></p>", "bold")).toBe(
      false,
    );
    expect(
      htmlIsThinTextWrapper(
        '<p data-pm-slice="1 1 []">**bold**</p>',
        "**bold**",
      ),
    ).toBe(false);
  });

  test.each([
    ["<p>different</p>", "# Heading"],
    ["<div>## First</div><div>## Second</div>", "## First## Second"],
    ["<span>**a b**</span>", "**ab**"],
    ["<p>**bold**</p><p><br></p>", "**bold**"],
    ["<p>**bold**</p><p><br></p>", "**bold**\n"],
    ["<p>**bold**</p><p><br></p><p>TRAIL</p>", "**bold**\n\nTRAIL"],
  ])("rejects a wrapper whose source differs: %s", (html, source) => {
    expect(htmlIsThinTextWrapper(html, source)).toBe(false);
  });
});
