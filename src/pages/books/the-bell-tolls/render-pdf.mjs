import { chromium } from "playwright";

const url = process.env.BT_URL ?? "http://localhost:4321/books/the-bell-tolls/";
const out = process.env.BT_OUT ?? "the-bell-tolls.pdf";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.emulateMedia({ media: "print" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: out,
  preferCSSPageSize: true,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
console.log(`wrote ${out}`);
