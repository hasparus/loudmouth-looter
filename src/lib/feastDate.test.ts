import { describe, expect, test } from "bun:test";

import { feastDate } from "./feastDate";

describe("feastDate", () => {
  test("includes the date year", () => {
    expect(feastDate(new Date(2024, 11, 25))).toBe(
      "in festo Nativitatis Domini, anno Domini MMXXIV",
    );
  });

  test("uses the post date year when nearest feast is in another year", () => {
    expect(feastDate(new Date(2024, 11, 31))).toBe(
      "vigilia Circumcisionis Domini, anno Domini MMXXIV",
    );
  });
});
