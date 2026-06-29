import { expect, test } from "@playwright/test";

test.describe("published post render parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/why-dragon/");
  });

  test("renders section headings", async ({ page }) => {
    for (const name of ["Mechanics", "Goals", "Pyre", "DM Moves"]) {
      await expect(
        page.getByRole("heading", { name: new RegExp(`^${name}`) }),
      ).toBeVisible();
    }
  });

  test("renders a basic move card with its heading lifted to title/id and no checkbox", async ({
    page,
  }) => {
    const card = page.locator("article.group", { hasText: "Bellow" });
    await expect(card).toHaveCount(1);

    // Basic moves are not player advancement moves, so they render without a
    // checkbox.
    await expect(card.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(card.getByRole("heading", { name: "Bellow" })).toHaveAttribute(
      "id",
      "bellow",
    );
    await expect(card).toContainText(
      "introduce a fact or narrative detail from your past life",
    );
  });

  test("renders the Pyre track with correct fill", async ({ page }) => {
    await expect(page.locator(".te-track")).toHaveCount(1);
    await expect(page.locator(".te-toggle")).toHaveCount(4);

    await expect(page.locator('.te-toggle[data-shape="square"]')).toHaveCount(
      4,
    );
    await expect(page.locator('.te-toggle[aria-checked="true"]')).toHaveCount(
      2,
    );
  });

  test("renders arrow marker lines", async ({ page }) => {
    const arrow = page.locator("p.te-arrow");
    await expect(arrow).toHaveCount(2);
    await expect(arrow.first()).toContainText("If you can do it, do it.");
  });
});
