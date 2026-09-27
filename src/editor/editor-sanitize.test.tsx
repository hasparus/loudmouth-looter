import { describe, expect, test } from "bun:test";

import { sanitizeUrl } from "./editor-sanitize";

describe("sanitizeUrl", () => {
  test.each([
    `java${"script:"}alert(1)`,
    "java\tscript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://example.com/\u0000bad",
  ])("rejects unsafe clipboard URL %s", (url) => {
    expect(sanitizeUrl(url)).toBe("");
  });

  test.each([
    "https://example.com/page",
    "http://example.com",
    "mailto:user@example.com",
    "/relative/path",
    "#heading",
  ])("preserves safe link %s", (url) => {
    expect(sanitizeUrl(url)).toBe(url);
  });
});
