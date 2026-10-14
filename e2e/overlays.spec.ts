import { expect, test } from "@playwright/test";
import sharp from "sharp";

test.describe("Tooltip raster stability", () => {
  test.use({
    deviceScaleFactor: 2,
    colorScheme: "dark",
    contextOptions: { reducedMotion: "no-preference" },
  });

  test("does not snap in height after settling at high zoom", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "Magnified desktop rendering",
    );
    await page.goto("/why-dragon/");
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: "html { zoom: 3; scroll-behavior: auto !important; }",
    });
    const trigger = page.getByRole("button", { name: "twice", exact: true });
    const tip = page.getByRole("tooltip");
    await trigger.scrollIntoViewIfNeeded();
    await trigger.focus();
    await tip.evaluate((element) => {
      for (const animation of element.getAnimations()) {
        animation.pause();
        animation.currentTime = 399;
      }
    });
    const box = (await tip.boundingBox())!;
    const clip = {
      x: Math.floor(box.x) - 10,
      y: Math.floor(box.y) - 10,
      width: Math.ceil(box.width) + 20,
      height: Math.ceil(box.height) + 20,
    };
    const paintedHeight = async () => {
      const { data, info } = await sharp(await page.screenshot({ clip }))
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const rows: number[] = [];
      for (let y = 0; y < info.height; y++) {
        let brightPixels = 0;
        for (let x = 0; x < info.width; x++) {
          const pixel = (y * info.width + x) * info.channels;
          if (Math.min(data[pixel]!, data[pixel + 1]!, data[pixel + 2]!) > 230)
            brightPixels++;
        }
        if (brightPixels > info.width * 0.6) rows.push(y);
      }
      expect(rows.length).toBeGreaterThan(0);
      return Math.max(...rows) - Math.min(...rows) + 1;
    };
    const animatedHeight = await paintedHeight();
    await tip.evaluate((element) => {
      for (const animation of element.getAnimations()) animation.finish();
    });
    await expect
      .poll(() => tip.evaluate((element) => element.getAnimations().length))
      .toBe(0);
    const settledHeight = await paintedHeight();
    expect(Math.abs(settledHeight - animatedHeight)).toBeLessThanOrEqual(1);
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`Commands backdrop blurs the page in ${colorScheme} mode`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await page.getByRole("button", { name: "Open command palette" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS("box-shadow", /0px 0px 0px 1px/);
    await expect(
      dialog.getByRole("option", { name: "GitHub", exact: true }),
    ).toHaveAttribute("href", "https://github.com/hasparus/loudmouth-looter");
    const backdrop = await dialog.evaluate((element) => {
      const style = getComputedStyle(element, "::backdrop");
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d")!;
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return {
        rgba: [...context.getImageData(0, 0, 1, 1).data],
        blur: style.backdropFilter,
      };
    });
    expect(backdrop.blur).toBe("blur(5px)");
    for (const channel of backdrop.rgba.slice(0, 3)) {
      if (colorScheme === "light") expect(channel).toBeGreaterThan(250);
      else expect(channel).toBeLessThan(20);
    }
    expect(backdrop.rgba[3]! / 255).toBeCloseTo(
      colorScheme === "light" ? 0.3 : 0.6,
      2,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`Prose tooltip enters and exits with ${reducedMotion} motion`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/why-dragon/");
    const trigger = page.getByRole("button", { name: "twice", exact: true });
    const tip = page.getByRole("tooltip");
    await expect(tip).toHaveCSS("opacity", "0");
    await trigger.focus();
    await expect(tip).toHaveCSS("opacity", "1");
    await expect(tip).toHaveCSS(
      "transition-duration",
      reducedMotion === "reduce" ? "0.15s" : "0.4s",
    );
    await expect(tip).toHaveCSS(
      "transform",
      reducedMotion === "reduce" ? "none" : "matrix(1, 0, 0, 1, 0, 0)",
    );
    await page.keyboard.press("Tab");
    await expect(tip).toHaveCSS("opacity", "0");
    await expect(tip).toHaveCSS(
      "transition-duration",
      reducedMotion === "reduce" ? "0.15s" : "0.15s, 0.15s",
    );
    if (testInfo.project.name !== "mobile") {
      await trigger.hover();
      await expect(tip).toHaveCSS("opacity", "1");
      await page.mouse.move(0, 0);
      await expect(tip).toHaveCSS("opacity", "0");
    }
    await trigger.focus();
    await expect(tip).toHaveCSS("opacity", "1");
  });
}
