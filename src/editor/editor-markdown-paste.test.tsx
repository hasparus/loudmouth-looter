import { describe, expect, test } from "bun:test";

import {
  htmlIsThinTextWrapper,
  looksLikeSupportedMarkdown,
  shouldPasteAsMarkdown,
} from "./editor-markdown-paste";

describe("looksLikeSupportedMarkdown", () => {
  test.each([
    "# Heading",
    "## Heading",
    "**bold**",
    "_italic_",
    "[label](https://example.com)",
    "![alt](https://example.com/image.png)",
    "- one",
    "1. one",
    "- one\n- two",
    "1. one\n2. two",
    "- [ ] todo",
  ])("detects supported Markdown: %s", (source) => {
    expect(looksLikeSupportedMarkdown(source)).toBe(true);
  });

  test.each([
    "",
    "Ordinary prose.",
    "First line\nSecond line",
    "https://example.com",
    "#hashtag",
  ])("does not over-detect plain text: %s", (source) => {
    expect(looksLikeSupportedMarkdown(source)).toBe(false);
  });

  test.each([
    "> a quote",
    "```ts\nconst answer = 42;\n```",
    "| A | B |\n| - | - |\n| 1 | 2 |",
    "### unsupported heading depth",
  ])("does not convert Markdown the editor cannot preserve: %s", (source) => {
    expect(looksLikeSupportedMarkdown(source)).toBe(false);
  });
});

describe("htmlIsThinTextWrapper", () => {
  test("accepts absent HTML and layout-only wrappers", () => {
    expect(htmlIsThinTextWrapper("", "**bold**")).toBe(true);
    expect(
      htmlIsThinTextWrapper(
        '<div class="line"><span style="color:red">**bold**</span></div>',
        "**bold**",
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

  test("rejects wrappers whose content differs", () => {
    expect(htmlIsThinTextWrapper("<p>different</p>", "# Heading")).toBe(false);
  });
});

describe("shouldPasteAsMarkdown", () => {
  test("requires both Markdown syntax and non-semantic clipboard HTML", () => {
    expect(shouldPasteAsMarkdown("**bold**", "<p>**bold**</p>")).toBe(true);
    expect(shouldPasteAsMarkdown("Ordinary prose.", "")).toBe(false);
    expect(
      shouldPasteAsMarkdown("**bold**", "<p><strong>**bold**</strong></p>"),
    ).toBe(false);
  });
});
