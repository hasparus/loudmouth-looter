import { describe, expect, test } from "bun:test";

import { sanitizeHtml, sanitizeUrl } from "./editor-sanitize";

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

describe("sanitizeHtml", () => {
  test("keeps prose blocks and marks, renaming browser tags", () => {
    expect(
      sanitizeHtml(
        "<blockquote><p><del>a</del> <strike>b</strike> <code>c</code></p></blockquote><hr>",
      ),
    ).toBe(
      "<blockquote><p><s>a</s> <s>b</s> <code>c</code></p></blockquote><hr>",
    );
  });

  test("flattens highlighted code blocks to text and keeps the language", () => {
    expect(
      sanitizeHtml(
        '<pre class="shiki"><code class="language-ts"><span style="color:red">const</span> a<br>= 1</code></pre>',
      ),
    ).toBe('<pre data-lang="ts">const a\n= 1</pre>');
  });

  test("drops an unsafe language label", () => {
    expect(sanitizeHtml('<pre data-lang="a&quot; onload=x">y</pre>')).toBe(
      "<pre>y</pre>",
    );
  });
});
