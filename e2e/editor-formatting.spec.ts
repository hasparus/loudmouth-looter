import { expect, type Locator, type Page, test } from "@playwright/test";

const EDITOR = { name: "Editor" } as const;

async function setEditor(page: Page, html: string, caret?: string) {
  await page.goto("/editor/");
  const editor = page.getByRole("textbox", EDITOR);
  await editor.click();
  await editor.evaluate(
    (el, [markup, target]) => {
      el.innerHTML = markup ?? "";
      const selection = getSelection();
      const range = document.createRange();
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && target && !node.textContent?.includes(target))
        node = walker.nextNode();
      if (node && target) {
        const start = node.textContent?.indexOf(target) ?? 0;
        range.setStart(node, start);
        range.setEnd(node, start + target.length);
      } else {
        range.selectNodeContents(el.lastElementChild ?? el);
        range.collapse(false);
      }
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
    [html, caret] as const,
  );
  return editor;
}

async function caretToStartOf(editor: Locator, selector: string) {
  await editor.evaluate((el, sel) => {
    const target = el.querySelector(sel);
    if (!target) throw new Error(`no ${sel}`);
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(true);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  }, selector);
}

const stored = (page: Page) =>
  page.evaluate(() => localStorage.getItem("text-editor-document") ?? "");

test.describe("editor formatting", () => {
  test("backticks make inline code, and typing continues outside it", async ({
    page,
  }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("run `npm test` now", { delay: 20 });
    await expect(editor.locator("code")).toHaveText("npm test");
    await expect(editor.locator("p")).toHaveText(/^run npm test\u200B? now$/);
    await expect(editor.locator("code")).not.toContainText("now");
  });

  test("~~strike~~ and *italic* convert as typed", async ({ page }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("~~old~~ and *new* ", { delay: 20 });
    await expect(editor.locator("s")).toHaveText("old");
    await expect(editor.locator("i")).toHaveText("new");
  });

  test("--- then Enter inserts a divider", async ({ page }) => {
    const editor = await setEditor(page, "<p>Before</p><p><br></p>");
    await editor.pressSequentially("---");
    await page.keyboard.press("Enter");
    await expect(editor.locator("hr")).toHaveCount(1);
    await editor.pressSequentially("After");
    await expect(editor.locator("hr + p")).toHaveText("After");
    await expect.poll(() => stored(page)).toContain("<hr>");
  });

  test("Backspace after a divider removes it", async ({ page }) => {
    const editor = await setEditor(page, "<p>A</p><hr><p>B</p>");
    await caretToStartOf(editor, "hr + p");
    await page.keyboard.press("Backspace");
    await expect(editor.locator("hr")).toHaveCount(0);
    await expect(editor.locator("p")).toHaveCount(2);
  });

  test("keyboard shortcuts toggle marks on a selection", async ({ page }) => {
    const editor = await setEditor(page, "<p>one two three</p>", "two");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(editor.locator("b, strong")).toHaveText("two");
    await page.keyboard.press("ControlOrMeta+b");
    await expect(editor.locator("b, strong")).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+e");
    await expect(editor.locator("code")).toHaveText("two");
    await page.keyboard.press("ControlOrMeta+e");
    await expect(editor.locator("code")).toHaveCount(0);

    await page.keyboard.press("ControlOrMeta+Shift+x");
    await expect(editor.locator("s, strike")).toHaveText("two");
    await expect(editor.locator("p")).toHaveText("one two three");
  });

  test("Mod-E on a collapsed caret wraps the word", async ({ page }) => {
    const editor = await setEditor(page, "<p>call fetch here</p>", "fetch");
    await editor.evaluate(() => getSelection()?.collapseToStart());
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ControlOrMeta+e");
    await expect(editor.locator("code")).toHaveText("fetch");
  });

  test("Mod-Alt-digit sets heading levels and Mod-Alt-0 resets", async ({
    page,
  }) => {
    const editor = await setEditor(page, "<p>Title here</p>");
    await page.keyboard.press("ControlOrMeta+Alt+2");
    await expect(editor.locator("h2")).toHaveText("Title here");
    await page.keyboard.press("ControlOrMeta+Alt+3");
    await expect(editor.locator("h3")).toHaveText("Title here");
    await page.keyboard.press("ControlOrMeta+Alt+0");
    await expect(editor.locator("p")).toHaveText("Title here");
    await expect(editor.locator("h2, h3")).toHaveCount(0);
  });

  test("Backspace at the start of a heading makes it a paragraph", async ({
    page,
  }) => {
    const editor = await setEditor(page, "<h2>Heading</h2>");
    await caretToStartOf(editor, "h2");
    await page.keyboard.press("Backspace");
    await expect(editor.locator("h2")).toHaveCount(0);
    await expect(editor.locator("p")).toHaveText("Heading");
  });

  test("> starts a quote and an empty line ends it", async ({ page }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("> Speak, friend");
    await page.keyboard.press("Enter");
    await expect(editor.locator("blockquote p").first()).toHaveText(
      "Speak, friend",
    );
    await page.keyboard.press("Enter");
    await editor.pressSequentially("and enter");
    await expect(editor.locator("blockquote")).toHaveCount(1);
    await expect(editor.locator("blockquote + p")).toHaveText("and enter");
  });

  test("Mod-Shift-. toggles a quote", async ({ page }) => {
    const editor = await setEditor(page, "<p>Quote me</p>");
    await page.keyboard.press("ControlOrMeta+Shift+Period");
    await expect(editor.locator("blockquote > p")).toHaveText("Quote me");
    await page.keyboard.press("ControlOrMeta+Shift+Period");
    await expect(editor.locator("blockquote")).toHaveCount(0);
  });

  test("list shortcuts wrap, switch and unwrap", async ({ page }) => {
    const editor = await setEditor(page, "<p>Item</p>");
    await page.keyboard.press("ControlOrMeta+Shift+Digit8");
    await expect(editor.locator("ul > li")).toHaveText("Item");
    await page.keyboard.press("ControlOrMeta+Shift+Digit7");
    await expect(editor.locator("ol > li")).toHaveText("Item");
    await page.keyboard.press("ControlOrMeta+Shift+Digit9");
    await expect(editor.locator("ul > li.te-task")).toHaveCount(1);
    await expect(editor.getByRole("checkbox")).toHaveCount(1);
    await page.keyboard.press("ControlOrMeta+Shift+Digit9");
    await expect(editor.locator("li")).toHaveCount(0);
    await expect(editor.locator("p")).toHaveText("Item");
  });

  test("``` opens a code block; Enter twice on a blank line leaves it", async ({
    page,
  }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("```ts");
    await page.keyboard.press("Enter");
    await expect(editor.locator('pre[data-lang="ts"]')).toHaveCount(1);
    await editor.pressSequentially("const a = 1;");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await editor.pressSequentially("**not bold**");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await editor.pressSequentially("Prose again");

    const pre = editor.locator("pre");
    await expect(pre).toHaveText("const a = 1;\n  **not bold**\n");
    await expect(editor.locator("pre strong")).toHaveCount(0);
    await expect(editor.locator("pre + p")).toHaveText("Prose again");
  });

  test("Mod-Enter escapes a code block", async ({ page }) => {
    const editor = await setEditor(page, "<pre>x\n</pre>");
    await caretToStartOf(editor, "pre");
    await page.keyboard.press("ControlOrMeta+Enter");
    await editor.pressSequentially("after");
    await expect(editor.locator("pre + p")).toHaveText("after");
  });

  test("pasting into a code block inserts plain text", async ({ page }) => {
    const editor = await setEditor(page, "<pre>a\n</pre>");
    await caretToStartOf(editor, "pre");
    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "# not a heading\n");
      data.setData("text/html", "<h1>not a heading</h1>");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await expect(editor.locator("h1")).toHaveCount(0);
    await expect(editor.locator("pre")).toHaveText("# not a heading\na\n");
  });

  test("pasting a URL over a selection links it", async ({ page }) => {
    const editor = await setEditor(page, "<p>see the docs here</p>", "docs");
    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "https://example.com/docs");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    const link = editor.getByRole("link", { name: "docs" });
    await expect(link).toHaveAttribute("href", "https://example.com/docs");
    await expect(editor.locator("p")).toHaveText("see the docs here");
  });

  test("Mod-K writes the selection as a link to finish typing", async ({
    page,
  }) => {
    const editor = await setEditor(page, "<p>read this now</p>", "this");
    await page.keyboard.press("ControlOrMeta+k");
    await expect(editor.locator("p")).toHaveText("read [this]( now");
    await editor.pressSequentially("https://example.com)");
    await expect(editor.getByRole("link", { name: "this" })).toHaveAttribute(
      "href",
      "https://example.com",
    );

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ControlOrMeta+k");
    await expect(editor.getByRole("link")).toHaveCount(0);
    await expect(editor.locator("p")).toHaveText(/^read this\u200B? now$/);
  });

  test("double hyphens become dashes and undo reverts", async ({ page }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("well -- maybe");
    await expect(editor.locator("p")).toHaveText("well – maybe");
    await editor.pressSequentially(" ---");
    await expect(editor.locator("p")).toHaveText("well – maybe —");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor.locator("p")).toHaveText("well – maybe –-");
  });

  test("new blocks survive a reload", async ({ page }) => {
    const editor = await setEditor(
      page,
      '<h3>Small</h3><blockquote><p>Quote <code>x</code> <s>y</s></p></blockquote><hr><pre data-lang="js">let a;\n</pre><p>end</p>',
    );
    await editor.pressSequentially("!");
    await expect.poll(() => stored(page)).toContain("end!");
    await page.reload();
    await expect(editor.locator("h3")).toHaveText("Small");
    await expect(editor.locator("blockquote code")).toHaveText("x");
    await expect(editor.locator("blockquote s")).toHaveText("y");
    await expect(editor.locator("hr")).toHaveCount(1);
    await expect(editor.locator('pre[data-lang="js"]')).toHaveText("let a;\n");
  });

  test("footer counts words", async ({ page }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("three little words");
    await expect(page.getByText("3 words")).toBeVisible();
  });

  test("slash menu offers quote, code and divider blocks", async ({ page }) => {
    const editor = await setEditor(page, "<p><br></p>");
    await editor.pressSequentially("/divider");
    await page.keyboard.press("Enter");
    await expect(editor.locator("hr")).toHaveCount(1);
    await editor.pressSequentially("/code");
    await page.keyboard.press("Enter");
    await expect(editor.locator("pre")).toHaveCount(1);
  });
});
