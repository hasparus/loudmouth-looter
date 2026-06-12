import { describe, expect, test } from "bun:test";

import { htmlToMdx, mdxToHtml } from "./editor-mdx";


describe("mdxToHtml", () => {
  test("h2 heading", () => {
    expect(mdxToHtml("## Hello World\n")).toBe("<h2>Hello World</h2>");
  });

  test("paragraph", () => {
    expect(mdxToHtml("A paragraph.\n")).toBe("<p>A paragraph.</p>");
  });

  test("strong and em", () => {
    expect(mdxToHtml("**bold** and _italic_\n")).toBe(
      "<p><strong>bold</strong> and <i>italic</i></p>",
    );
  });

  test("GFM task list", () => {
    const html = mdxToHtml("- [x] done\n- [ ] todo\n");
    expect(html).toContain('class="te-task"');
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain('aria-checked="false"');
    expect(html).toContain("done");
    expect(html).toContain("todo");
  });

  test("static Track → te-track span, no data-interactive", () => {
    const html = mdxToHtml('<Track shape="circle" value="3" max="5" />\n');
    expect(html).toContain('class="te-track"');
    expect(html).not.toContain("data-interactive");
    const checked = (html.match(/aria-checked="true"/g) ?? []).length;
    const unchecked = (html.match(/aria-checked="false"/g) ?? []).length;
    expect(checked).toBe(3);
    expect(unchecked).toBe(2);
  });

  test("interactive Track → data-interactive=1", () => {
    const html = mdxToHtml(
      '<Track shape="square" defaultValue="1" max="4" />\n',
    );
    expect(html).toContain('data-interactive="1"');
    expect(html).toContain('data-shape="square"');
  });

  test("legacy Track (filled/total) → DOM with correct counts", () => {
    const html = mdxToHtml('<Track shape="rhomb" filled="1" total="3" />\n');
    expect(html).toContain('data-shape="rhomb"');
    const checked = (html.match(/aria-checked="true"/g) ?? []).length;
    expect(checked).toBe(1);
    const unchecked = (html.match(/aria-checked="false"/g) ?? []).length;
    expect(unchecked).toBe(2);
  });

  test("Move with heading and paragraph", () => {
    const html = mdxToHtml("<Move>\n## Title\n\nBody text.\n</Move>\n");
    expect(html).toBe(
      '<div class="te-move"><h2>Title</h2><p>Body text.</p></div>',
    );
  });
});


describe("htmlToMdx", () => {
  test("h2 → ## heading", () => {
    expect(htmlToMdx("<h2>Hello World</h2>")).toBe("## Hello World\n");
  });

  test("paragraph", () => {
    expect(htmlToMdx("<p>A paragraph.</p>")).toBe("A paragraph.\n");
  });

  test("strong and em round-trip", () => {
    expect(htmlToMdx("<p><strong>bold</strong> and <i>italic</i></p>")).toBe(
      "**bold** and _italic_\n",
    );
  });

  test("GFM task list round-trip", () => {
    const taskHtml =
      '<ul>' +
      '<li class="te-task">' +
      '<button class="te-toggle" data-shape="square" type="button" role="checkbox" aria-label="square" aria-checked="true" contenteditable="false"></button>' +
      "done" +
      "</li>" +
      '<li class="te-task">' +
      '<button class="te-toggle" data-shape="square" type="button" role="checkbox" aria-label="square" aria-checked="false" contenteditable="false"></button>' +
      "todo" +
      "</li>" +
      "</ul>";
    expect(htmlToMdx(taskHtml)).toBe("- [x] done\n- [ ] todo\n");
  });

  test("static Track DOM → value/max MDX", () => {
    const html = mdxToHtml('<Track shape="circle" value="3" max="5" />\n');
    expect(htmlToMdx(html)).toBe('<Track shape="circle" value="3" max="5" />\n');
  });

  test("interactive Track DOM → defaultValue MDX (core invariant)", () => {
    const html = mdxToHtml(
      '<Track shape="square" defaultValue="1" max="4" />\n',
    );
    expect(htmlToMdx(html)).toBe(
      '<Track shape="square" defaultValue="1" max="4" />\n',
    );
  });

  test("legacy Track DOM → re-emits as value/max", () => {
    const html = mdxToHtml('<Track shape="rhomb" filled="1" total="3" />\n');
    expect(htmlToMdx(html)).toBe(
      '<Track shape="rhomb" value="1" max="3" />\n',
    );
  });

  test("Move card survives round-trip", () => {
    const original = "<Move>\n## Title\n\nBody text.\n</Move>\n";
    const html = mdxToHtml(original);
    expect(htmlToMdx(html)).toBe(
      "<Move>\n  ## Title\n\n  Body text.\n</Move>\n",
    );
  });

  test("plain text unchanged (modulo trailing newline)", () => {
    const mdx = "Just plain text.\n";
    expect(htmlToMdx(mdxToHtml(mdx))).toBe(mdx);
  });
});
