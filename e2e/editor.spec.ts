import { expect, test } from "@playwright/test";

const EDITOR = { name: "Editor" } as const;

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
});
