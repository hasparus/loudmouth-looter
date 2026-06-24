import { expect, type Page, test } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const pages = [
  { path: "/", name: "index" },
  { path: "/design/", name: "design" },
  { path: "/why-dragon/", name: "why-dragon" },
] as const;

let committedSnapshots: Set<string>;

test.beforeAll(async () => {
  const snapshots = await readdir(
    join(__dirname, "visual-regression.spec.ts-snapshots"),
  );
  committedSnapshots = new Set(snapshots);
});

test.describe("Visual regression", () => {
  for (const { path, name } of pages) {
    test(`${name} page matches screenshot`, async ({ page }, testInfo) => {
      const snapshot = `${name}-${testInfo.project.name}-${process.platform}.png`;
      test.skip(
        !committedSnapshots.has(snapshot),
        `Snapshot ${snapshot} not committed`,
      );

      await page.goto(path);
      await ensurePageStable(page);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        maxDiffPixels: 500,
        maxDiffPixelRatio: 0.005,
      });
    });
  }
});

async function ensurePageStable(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let y = 0;
      const step = () => {
        window.scrollTo(0, y);
        y += window.innerHeight;
        if (y < document.body.scrollHeight) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo(0, 0);
          requestAnimationFrame(() => resolve());
        }
      };
      step();
    });
  });

  await page.waitForLoadState("networkidle");

  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : img.decode().catch(() => undefined),
      ),
    );
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
  });

  await page.waitForTimeout(150);
}
