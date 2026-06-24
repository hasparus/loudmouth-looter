import { expect, test } from "@playwright/test";

const FIXTURE = "/_fixtures/e2e-fixture/";

test.describe("e2e fixture post", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FIXTURE);
  });

  test("renders fixture section headings", async ({ page }) => {
    for (const name of [
      "Tracks",
      "Marker lines",
      "Tasks",
      "Moves",
      "Code",
      "Markdown",
    ]) {
      await expect(page.getByRole("heading", { name })).toBeVisible();
    }
  });

  test("renders a move card with its heading lifted to title/id", async ({
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

  test("move card checkbox toggles", async ({ page }) => {
    const move = page
      .locator("article.group")
      .filter({ has: page.getByRole("heading", { name: "Learn and Grow" }) });
    await expect(move).toBeVisible();

    const checkbox = move.getByRole("checkbox").first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test("code blocks have syntax-colored spans", async ({ page }) => {
    const coloredSpans = page.locator("pre.astro-code span[style*='color']");
    expect(await coloredSpans.count()).toBeGreaterThan(5);
  });

  test("renders markdown kitchen-sink elements", async ({ page }) => {
    const prose = page.locator(".zaduma-prose-grid");

    await expect(prose.getByRole("table")).toBeVisible();
    await expect(prose.getByRole("blockquote")).toBeVisible();
    await expect(
      prose.getByRole("link", { name: "fixture link" }),
    ).toBeVisible();
    await expect(prose.getByRole("img", { name: "Fixture image" })).toBeVisible();
    await expect(prose.locator("aside")).toContainText(
      "Fixture side note for prose-grid layout",
    );
    await expect(prose.locator("sub")).toHaveText("2");
    await expect(prose.locator("p", { hasText: "X" }).locator("sup")).toHaveText(
      "2",
    );
    await expect(prose.getByRole("link", { name: "1", exact: true })).toBeVisible();
  });

  test("aside positioned to the right on desktop", async ({ page }, testInfo) => {
    const aside = page.locator("aside", {
      hasText: "Fixture side note for prose-grid layout",
    });
    await expect(aside).toHaveCount(1);

    if (testInfo.project.name !== "mobile") {
      const box = await aside.boundingBox();
      expect(box?.x).toBeGreaterThan(300);
    }
  });

  test("desktop aside content overflows without sizing the grid row", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Desktop-only layout");

    const geometry = await page
      .locator(".zaduma-prose-grid")
      .evaluate((grid) => {
        const aside = grid.querySelector("aside");
        if (!aside) return null;

        const asideBox = aside.getBoundingClientRect();
        const previousBox =
          aside.previousElementSibling?.getBoundingClientRect() ?? null;
        const marker = getComputedStyle(aside, "::before");

        return {
          asideHeight: asideBox.height,
          markerHeight: parseFloat(marker.height),
          topDelta: previousBox
            ? Math.abs(asideBox.top - previousBox.top)
            : null,
          borderLeftWidth: marker.borderLeftWidth,
        };
      });

    expect(geometry).not.toBeNull();
    expect(geometry!.asideHeight).toBe(0);
    expect(geometry!.markerHeight).toBeGreaterThan(0);
    expect(geometry!.topDelta).toBeLessThan(1);
    expect(geometry!.borderLeftWidth).toBe("1px");
  });

  test("is excluded from the index and llms.txt", async ({ request }) => {
    const index = await request.get("/");
    expect(await index.text()).not.toContain("/_fixtures/e2e-fixture/");

    const llms = await request.get("/llms.txt");
    expect(await llms.text()).not.toContain("E2E fixture");
  });
});
