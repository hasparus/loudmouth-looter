import { expect, test } from "@playwright/test";

const EDITOR = { name: "Editor" } as const;

async function pasteData(
  editor: import("@playwright/test").Locator,
  formats: Record<string, string>,
) {
  await editor.evaluate((element, payload) => {
    const data = new DataTransfer();
    for (const [format, value] of Object.entries(payload))
      data.setData(format, value);
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, formats);
}

async function clearEditor(page: import("@playwright/test").Page) {
  const editor = page.getByRole("textbox", EDITOR);
  await editor.click();
  await editor.evaluate((el) => {
    el.innerHTML = "<p><br></p>";
    const range = document.createRange();
    range.selectNodeContents(el.firstChild as Node);
    range.collapse(true);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  return editor;
}

test.describe("editor", () => {
  test("loads and hydrates the writing surface", async ({ page }) => {
    await page.goto("/editor/");
    await expect(page).toHaveTitle(
      "The Plan of the Parliament of Erl — loudmouth looter",
    );
    await expect(page.getByRole("textbox", EDITOR)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editor guide" }),
    ).toBeVisible();
  });

  test("slash menu opens as a listbox and matches commands", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.pressSequentially("/sq");

    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option", { name: /squares/i })).toBeVisible();
  });

  test("inserts a squares track with the requested count", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("/squares 4");
    await page.keyboard.press("Enter");

    await expect(editor.getByRole("checkbox", { name: "square" })).toHaveCount(
      4,
    );
  });

  test("converts `- [ ] ` shorthand into a task with a toggle", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("- [ ] ", { delay: 40 });
    const toggle = editor.getByRole("checkbox").first();
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    await editor.pressSequentially("write the tests", { delay: 20 });
    await expect(editor.getByText("write the tests")).toBeVisible();

    await toggle.click();
    await expect(toggle).toBeChecked();
  });

  test("slash menu navigates with arrows, commits a block on Enter", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("/");
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("option", { selected: true })).toHaveCount(1);

    const before = await editor.getAttribute("aria-activedescendant");
    await page.keyboard.press("ArrowDown");
    await expect(editor).not.toHaveAttribute(
      "aria-activedescendant",
      before ?? "",
    );

    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();

    await editor.pressSequentially("arrow");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(menu).not.toBeVisible();
    await expect(editor.locator("p.te-arrow")).toHaveCount(1);
  });

  test("help modal opens, then closes via Escape and the close button", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const guide = page.getByRole("button", { name: "Editor guide" });

    await guide.click();
    const dialog = page.getByRole("dialog", { name: "Editor guide" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Editor guide" }),
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    await guide.click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("updates document title from the first h1", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.pressSequentially("# My Custom Title");
    await page.keyboard.press("Enter");

    await expect(page).toHaveTitle("My Custom Title — loudmouth looter");
  });

  test("spellcheck toggle flips its label", async ({ page }) => {
    await page.goto("/editor/");
    const turnOff = page.getByRole("button", { name: "Turn spellcheck off" });
    await expect(turnOff).toBeVisible();

    await turnOff.click();
    await expect(
      page.getByRole("button", { name: "Turn spellcheck on" }),
    ).toBeVisible();
  });

  test("pastes every block of multi-block content", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    const words = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot"];
    await editor.evaluate((el, blocks) => {
      const data = new DataTransfer();
      data.setData("text/html", blocks.map((w) => `<p>${w}</p>`).join(""));
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, words);

    for (const word of words) {
      await expect(editor).toContainText(word);
    }
  });

  test("detects and formats Markdown from thin clipboard wrappers", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    const markdown =
      "## Pasted notes\n\nA **bold** intro.\n\n- first\n- second";

    await editor.evaluate((el, source) => {
      const data = new DataTransfer();
      data.setData("text/plain", source);
      data.setData(
        "text/html",
        "<div>## Pasted notes</div><div><br></div>" +
          "<div>A **bold** intro.</div><div><br></div>" +
          "<div>- first</div><div>- second</div>",
      );
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, markdown);

    await expect(
      editor.getByRole("heading", { name: "Pasted notes" }),
    ).toBeVisible();
    await expect(editor.locator("strong")).toHaveText("bold");
    await expect(editor.locator("ul > li")).toHaveCount(2);
  });

  test("honors an explicit text/markdown clipboard payload", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "fallback text");
      data.setData("text/markdown", "# Explicit Markdown");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(
      editor.getByRole("heading", { name: "Explicit Markdown" }),
    ).toBeVisible();
    await expect(editor).not.toContainText("fallback text");
  });

  test("pastes inline Markdown at the caret without splitting the paragraph", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      element.innerHTML = "<p>beforeafter</p>";
      const text = element.firstChild!.firstChild!;
      const range = document.createRange();
      range.setStart(text, 6);
      range.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });

    await pasteData(editor, { "text/plain": "**bold**" });
    await expect(editor.locator("p")).toHaveCount(1);
    await expect(editor.locator("p")).toHaveText("beforeboldafter");
    await expect(editor.locator("strong")).toHaveText("bold");
    await page.reload();
    await expect(editor.locator("strong")).toHaveText("bold");
  });

  test("leaves mixed unsupported Markdown intact", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    const source = "## Good\n\n### Important\n\n| A | B |\n| - | - |";

    await pasteData(editor, { "text/plain": source });
    await expect(editor).toContainText("### Important");
    await expect(editor).toContainText("| A | B |");
    await expect(editor.getByRole("heading", { name: "Good" })).toHaveCount(0);
  });

  test("rejects lossy explicit Markdown and keeps the plain-text fallback", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/markdown": "# Heading\n\n| A | B |\n| - | - |",
      "text/plain": "Intact fallback",
    });

    await expect(editor).toContainText("Intact fallback");
    await expect(editor.getByRole("heading", { name: "Heading" })).toHaveCount(
      0,
    );
  });

  test("prefers semantic HTML over competing explicit Markdown", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/markdown": "# Incomplete",
      "text/plain": "Complete rich copy",
      "text/html": "<p><strong>Complete rich copy</strong></p>",
    });

    await expect(editor.locator("strong")).toHaveText("Complete rich copy");
    await expect(
      editor.getByRole("heading", { name: "Incomplete" }),
    ).toHaveCount(0);
  });

  test("does not paste into a detached block after loading Markdown", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await editor.evaluate((element) => {
      const data = new DataTransfer();
      data.setData("text/plain", "**bold**");
      element.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
      element.innerHTML = "<p>replacement</p>";
    });

    await expect(editor).toHaveText("replacement");
    await expect(editor.locator("strong")).toHaveCount(0);
  });

  test("uses plain text if the Markdown chunk fails to load", async ({
    page,
  }) => {
    await page.route("**/editor-markdown-paste.*.js", (route) => route.abort());
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, { "text/plain": "**bold**" });

    await expect(editor).toContainText("**bold**");
    await expect(editor.locator("strong")).toHaveCount(0);
  });

  test("retains rich HTML's trailing blank block", async ({ page }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);
    await pasteData(editor, {
      "text/plain": "**bold**",
      "text/html": "<p>**bold**</p><p><br></p>",
    });

    await expect(editor).toContainText("**bold**");
    await expect(editor.locator("strong")).toHaveCount(0);
  });

  test("preserves semantic rich HTML that resembles Markdown", async ({
    page,
  }) => {
    await page.goto("/editor/");
    const editor = await clearEditor(page);

    await editor.evaluate((el) => {
      const data = new DataTransfer();
      data.setData("text/plain", "**literal markers**");
      data.setData("text/html", "<p><i>**literal markers**</i></p>");
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await expect(editor.locator("i")).toHaveText("**literal markers**");
    await expect(editor.locator("strong")).toHaveCount(0);
  });
});
