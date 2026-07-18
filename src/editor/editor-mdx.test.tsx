import { describe, expect, test } from "bun:test";

import { formatInline } from "./editor-dom";
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

  test("Move with heading and paragraph", () => {
    const html = mdxToHtml("<Move>\n## Title\n\nBody text.\n</Move>\n");
    expect(html).toContain('class="te-move');
    expect(html).toContain("<h3");
    expect(html).toContain("Title");
    expect(html).toContain("<p>Body text.</p>");
    expect(html).toContain('type="checkbox"');
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

  test("link round-trip", () => {
    expect(htmlToMdx('<p><a href="https://example.com">label</a></p>')).toBe(
      "[label](https://example.com)\n",
    );
    expect(mdxToHtml("[label](https://example.com)\n")).toBe(
      '<p><a href="https://example.com">label</a></p>',
    );
  });

  test("image round-trip", () => {
    expect(
      htmlToMdx('<p><img src="https://example.com/x.png" alt="cat"></p>'),
    ).toBe("![cat](https://example.com/x.png)\n");
    expect(mdxToHtml("![cat](https://example.com/x.png)\n")).toBe(
      '<p><img src="https://example.com/x.png" alt="cat"></p>',
    );
  });

  test("GFM task list round-trip", () => {
    const taskHtml =
      "<ul>" +
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
    expect(htmlToMdx(html)).toBe(
      '<Track shape="circle" value="3" max="5" />\n',
    );
  });

  test("interactive Track DOM → defaultValue MDX (core invariant)", () => {
    const html = mdxToHtml(
      '<Track shape="square" defaultValue="1" max="4" />\n',
    );
    expect(htmlToMdx(html)).toBe(
      '<Track shape="square" defaultValue="1" max="4" />\n',
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

describe("formatInline", () => {
  test("link with underscores/asterisks in URL is not mangled", () => {
    expect(formatInline("[doc](https://x.com/a_b_c)")).toBe(
      '<a href="https://x.com/a_b_c" rel="noreferrer">doc</a>',
    );
    expect(formatInline("see [d](https://x.com/__init__.py) now")).toBe(
      'see <a href="https://x.com/__init__.py" rel="noreferrer">d</a> now',
    );
  });

  test("emphasis still applies outside links and in labels", () => {
    expect(formatInline("a _b_ [**c**](https://x.com)")).toBe(
      'a <i>b</i> <a href="https://x.com" rel="noreferrer"><strong>c</strong></a>',
    );
  });

  test("unsafe href is left as literal text", () => {
    expect(formatInline("[x](javascript:alert(1))")).toBe(
      "[x](javascript:alert(1))",
    );
  });
});

describe("MDX preservation (unknown JSX, imports, frontmatter)", () => {
  test("unknown flow JSX becomes a non-editable te-jsx atom", () => {
    const html = mdxToHtml("<BellowRules components={props.components} />\n");
    expect(html).toContain('class="te-jsx"');
    expect(html).toContain('contenteditable="false"');
    expect(html).toContain("BellowRules");
  });

  test("unknown flow JSX round-trips verbatim", () => {
    const mdx = "<BellowRules components={props.components} />\n";
    expect(htmlToMdx(mdxToHtml(mdx))).toContain(
      "<BellowRules components={props.components} />",
    );
  });

  test("imports round-trip verbatim", () => {
    const mdx =
      'import A from "./a.mdx";\nimport B from "./b.mdx";\n\nHello.\n';
    const back = htmlToMdx(mdxToHtml(mdx));
    expect(back).toContain(
      'import A from "./a.mdx";\nimport B from "./b.mdx";',
    );
    expect(back).toContain("Hello.");
  });

  test("JSX with markdown children keeps its inner source", () => {
    const mdx =
      "<aside>\n  Clayton is turning **1 HP Dragon** into a full game.\n</aside>\n";
    const back = htmlToMdx(mdxToHtml(mdx));
    expect(back).toContain("<aside>");
    expect(back).toContain("**1 HP Dragon**");
    expect(back).toContain("</aside>");
  });

  test("frontmatter survives instead of parsing as thematic breaks", () => {
    const mdx = '---\ndate: "2026-06-06"\ntitle: T\n---\n\nBody.\n';
    const html = mdxToHtml(mdx);
    expect(html).toContain("frontmatter");
    const back = htmlToMdx(html);
    expect(back).toContain('---\ndate: "2026-06-06"\ntitle: T\n---');
    expect(back).toContain("Body.");
  });

  test("flow expressions like prettier-ignore comments survive", () => {
    const mdx = "{/* prettier-ignore */}\n\nA paragraph.\n";
    const back = htmlToMdx(mdxToHtml(mdx));
    expect(back).toContain("{/* prettier-ignore */}");
  });

  test("inline unknown JSX shows its text and round-trips", () => {
    const mdx = 'more than <Tooltip text="hi">twice</Tooltip> as fast\n';
    const html = mdxToHtml(mdx);
    expect(html).toContain('class="te-jsx-inline"');
    expect(html).toContain("twice");
    expect(htmlToMdx(html)).toContain('<Tooltip text="hi">twice</Tooltip>');
  });

  test("unknown JSX inside a Move body survives the round-trip", () => {
    const mdx =
      "<Move illuminated isBaseMove>\n\n### Bellow\n\n<BellowRules components={props.components} />\n\n</Move>\n";
    const back = htmlToMdx(mdxToHtml(mdx));
    expect(back).toContain("## Bellow");
    expect(back).toContain("<BellowRules components={props.components} />");
  });

  test("Move attributes like illuminated/isBaseMove round-trip", () => {
    const mdx =
      "<Move illuminated isBaseMove>\n\n### Bellow\n\nBody text.\n\n</Move>\n";
    const back = htmlToMdx(mdxToHtml(mdx));
    expect(back).toContain("<Move illuminated isBaseMove>");
  });
});
