import { describe, expect, test } from "bun:test";

import { feastDate } from "./feastDate";

describe("feastDate", () => {
  test("includes the date year", () => {
    expect(feastDate(new Date(Date.UTC(2024, 11, 25)))).toBe(
      "in festo Nativitatis Domini MMXXIV",
    );
  });

  test("uses the post date year when nearest feast is in another year", () => {
    expect(feastDate(new Date(Date.UTC(2024, 11, 31)))).toBe(
      "vigilia Circumcisionis Domini MMXXIV",
    );
  });

  test("is timezone-independent (derives from the UTC instant)", () => {
    expect(feastDate("2024-12-25T00:00:00.000Z")).toBe(
      "in festo Nativitatis Domini MMXXIV",
    );
  });
});
