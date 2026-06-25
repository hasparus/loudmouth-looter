import { describe, expect, test } from "bun:test";

import { postPath } from "./postPath";

describe("postPath", () => {
  test("keeps flat post routes", () => {
    expect(postPath("/repo/posts", "/repo/posts/why-dragon.mdx")).toBe(
      "/why-dragon",
    );
  });

  test("maps folder index posts to the folder route", () => {
    expect(postPath("/repo/posts", "/repo/posts/why-dragon/index.mdx")).toBe(
      "/why-dragon",
    );
  });

  test("maps nested folder index posts to the parent route", () => {
    expect(
      postPath("/repo/posts", "/repo/posts/games/why-dragon/index.md"),
    ).toBe("/games/why-dragon");
  });

  test("maps root index to root", () => {
    expect(postPath("/repo/posts", "/repo/posts/index.mdx")).toBe("/");
  });
});
