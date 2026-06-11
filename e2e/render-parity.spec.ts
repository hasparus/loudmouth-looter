import { expect, test } from "@playwright/test";

test.describe("published post render parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/features/editor-atoms");
  });

  test("renders section headings", async ({ page }) => {
    for (const name of ["Tracks", "Marker lines", "Tasks", "Moves"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("renders a move card with its heading lifted to title/id", async ({
    page,
  }) => {
    const card = page.locator("article.te-move");
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("id", "learn-and-grow");

    await expect(
      card.getByRole("heading", { name: "Learn and Grow" }),
    ).toBeVisible();
    await expect(card).toContainText(
      "discuss with the table what move or compendium fits",
    );
  });

  test("renders all three track shapes with correct fill", async ({ page }) => {
    await expect(page.locator(".te-track")).toHaveCount(3);
    await expect(page.locator(".te-toggle")).toHaveCount(12);

    await expect(page.locator('.te-toggle[data-shape="square"]')).toHaveCount(
      4,
    );
    await expect(page.locator('.te-toggle[data-shape="circle"]')).toHaveCount(
      5,
    );
    await expect(page.locator('.te-toggle[data-shape="rhomb"]')).toHaveCount(3);

    await expect(page.locator('.te-toggle[aria-checked="true"]')).toHaveCount(
      6,
    );
  });

  test("renders arrow and chevron marker lines", async ({ page }) => {
    const arrow = page.locator("p.te-arrow");
    await expect(arrow).toContainText("Goblins pour out of the broken gate");

    const chevron = page.locator("p.te-chevron");
    await expect(chevron).toContainText("What do you do?");
  });

  test("renders GFM tasks with preserved checked state", async ({ page }) => {
    const checkboxes = page.getByRole("main").getByRole("checkbox");
    await expect(checkboxes).toHaveCount(3);
    await expect(checkboxes.nth(0)).toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
    await expect(checkboxes.nth(2)).not.toBeChecked();
  });
});
