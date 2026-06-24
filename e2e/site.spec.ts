import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("renders with article list", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toHaveText("loudmouth looter");
    await expect(
      page.getByRole("link", { name: "Why Would You Fight a Dragon?" }).first(),
    ).toBeVisible();
  });
});

test.describe("Article pages", () => {
  test("why-dragon page renders correctly", async ({ page }) => {
    await page.goto("/why-dragon/");
    await expect(page.locator("h1")).toHaveText(
      "Why Would You Fight a Dragon?",
    );
    await expect(
      page.locator("aside", { hasText: "DM = Dragon Minder" }),
    ).toHaveCount(1);
    await expect(page.locator("time")).toBeVisible();

    const neptune = page.locator('img[src*="neptune"]').first();
    await neptune.scrollIntoViewIfNeeded();
    await expect(neptune).toBeVisible();
    expect(
      await neptune.evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
    ).toBe(true);
  });
});

test.describe("Asides render as side notes on wide viewports", () => {
  test("aside positioned to the right on desktop", async ({
    page,
  }, testInfo) => {
    await page.goto("/why-dragon/");
    const aside = page.locator("aside").first();
    await expect(aside).toHaveCount(1);

    if (testInfo.project.name !== "mobile") {
      const box = await aside.boundingBox();
      expect(box?.x).toBeGreaterThan(300);
    }
  });
});

test.describe("OG images", () => {
  test("og meta tags are present on article pages", async ({ page }) => {
    await page.goto("/why-dragon/");
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute("content", /.+/);
  });
});

test.describe("Move cards (published)", () => {
  test("why-dragon renders move cards with a heading and a checkbox", async ({
    page,
  }) => {
    await page.goto("/why-dragon/");
    const move = page
      .locator("article.group")
      .filter({ has: page.getByRole("heading", { name: "Hear Me Roar" }) });
    await expect(move).toBeVisible();

    const checkbox = move.getByRole("checkbox").first();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });
});

test("homepage is readable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-specific test");
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Why Would You Fight a Dragon?" }).first(),
  ).toBeVisible();
  const body = page.locator("body");
  const box = await body.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(375);
});

test("color scheme switches with command palette and responds to media preference", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  if (testInfo.project.name !== "mobile") {
    await page.getByLabel("Open command palette").waitFor({ state: "visible" });

    try {
      await page.keyboard.press("ControlOrMeta+K");
    } catch {
      await page.getByLabel("Open command palette").click();
    }

    await expect(page.getByRole("dialog")).toBeVisible();

    await page.keyboard.press("Alt+T");
    await expect(page.getByText("Set Theme to Dark")).toBeVisible();
    await page.keyboard.press("2");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Alt+T");
    await expect(page.getByText("Set Theme to Light")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Alt+T");
    await expect(page.getByText("Set Theme to System")).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.emulateMedia({ colorScheme: null });
});
