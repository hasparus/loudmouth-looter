import { expect, test } from "bun:test";

import { tagSlug } from "./tagSlug";

test("tagSlug", () => {
  expect(tagSlug("West Marches")).toBe("west-marches");
  expect(tagSlug("kapitularz-2026")).toBe("kapitularz-2026");
  expect(tagSlug("🇵🇱")).toBe("pl");
});
