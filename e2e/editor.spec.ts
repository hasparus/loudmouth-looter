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
    await page.goto("/editor");
    await expect(page.getByRole("textbox", EDITOR)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editor guide" }),
    ).toBeVisible();
  });

  test("slash menu opens as a listbox and matches commands", async ({
    page,
  }) => {
    await page.goto("/editor");
    const editor = await clearEditor(page);
    await editor.pressSequentially("/sq");

    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("option", { name: /squares/i }),
    ).toBeVisible();
  });

  test("inserts a squares track with the requested count", async ({ page }) => {
    await page.goto("/editor");
    const editor = await clearEditor(page);

    await editor.pressSequentially("/squares 4");
    await page.keyboard.press("Enter");

    await expect(
      editor.getByRole("checkbox", { name: "square" }),
    ).toHaveCount(4);
  });

  test("converts `- [ ] ` shorthand into a task with a toggle", async ({
    page,
  }) => {
    await page.goto("/editor");
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
});
