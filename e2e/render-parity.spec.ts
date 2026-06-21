import { expect, test } from "@playwright/test";

test.describe("published post render parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/features/editor-atoms/");
  });

  test("renders section headings", async ({ page }) => {
    for (const name of ["Tracks", "Marker lines", "Tasks", "Moves"]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("renders a move card (dungeon-motion MoveCard) with its heading lifted to title/id", async ({
    page,
  }) => {
    const card = page.locator("article.group", { hasText: "Learn and Grow" });
    await expect(card).toHaveCount(1);

    await expect(card.locator('input[type="checkbox"]')).toHaveAttribute(
      "id",
      "learn-and-grow",
    );
    await expect(
      card.getByRole("heading", { name: "Learn and Grow" }),
    ).toHaveAttribute("id", "learn-and-grow-title");
    await expect(card).toContainText(
      "discuss with the table what move or compendium fits",
    );
  });

  test("renders all three track shapes with correct fill", async ({ page }) => {
    await expect(page.locator(".te-track")).toHaveCount(4);
    await expect(page.locator(".te-toggle")).toHaveCount(16);

    await expect(page.locator('.te-toggle[data-shape="square"]')).toHaveCount(
      8,
    );
    await expect(page.locator('.te-toggle[data-shape="circle"]')).toHaveCount(
      5,
    );
    await expect(page.locator('.te-toggle[data-shape="rhomb"]')).toHaveCount(3);

    await expect(page.locator('.te-toggle[aria-checked="true"]')).toHaveCount(
      7,
    );
  });

  test("renders arrow and chevron marker lines", async ({ page }) => {
    const arrow = page.locator("p.te-arrow");
    await expect(arrow).toContainText("Goblins pour out of the broken gate");

    const chevron = page.locator("p.te-chevron");
    await expect(chevron).toContainText("What do you do?");
  });

  test("renders GFM tasks with preserved checked state", async ({ page }) => {
    const checkboxes = page.locator(
      "ul.contains-task-list input[type=checkbox]",
    );
    await expect(checkboxes).toHaveCount(3);
    await expect(checkboxes.nth(0)).toBeChecked();
    await expect(checkboxes.nth(1)).toBeChecked();
    await expect(checkboxes.nth(2)).not.toBeChecked();
  });

  test("interactive track toggles on click", async ({ page }) => {
    const track = page.locator(".te-track:not([data-preview])");
    await expect(track).toHaveCount(1);

    const secondToggle = track.locator(".te-toggle").nth(1);
    await expect(secondToggle).toHaveAttribute("aria-checked", "false");
    await secondToggle.click();
    await expect(secondToggle).toHaveAttribute("aria-checked", "true");

    await page.reload();
    const trackAfter = page.locator(".te-track:not([data-preview])");
    await expect(
      trackAfter.locator('.te-toggle[aria-checked="true"]'),
    ).toHaveCount(1);
  });
});
