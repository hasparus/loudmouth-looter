import { describe, expect, test } from "bun:test";

import { titleCase } from "./titleCase";

describe("titleCase", () => {
  test("capitalizes first and last word", () => {
    expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
  });

  test("lowercases small words in the middle", () => {
    expect(titleCase("war and peace")).toBe("War and Peace");
  });

  test("kebab-case slug becomes space-separated title", () => {
    expect(titleCase("markdown-cheat-sheet")).toBe("Markdown Cheat Sheet");
  });

  test("hyphen between small words keeps them lowercased", () => {
    expect(titleCase("bread-and-butter")).toBe("Bread and Butter");
  });

  test("preserves intentional internal capitals (CamelCase)", () => {
    expect(titleCase("shiki-twoslash")).toBe("Shiki Twoslash");
  });

  test("small word at end is capitalized", () => {
    expect(titleCase("what is this for")).toBe("What Is This For");
  });

  test("small word at start is capitalized", () => {
    expect(titleCase("a short title")).toBe("A Short Title");
  });

  test("single word", () => {
    expect(titleCase("hello")).toBe("Hello");
  });

  test("words outside the small-words list stay capitalized", () => {
    expect(titleCase("getting started with astro")).toBe(
      "Getting Started With Astro",
    );
  });

  test("already-correct case unchanged", () => {
    expect(titleCase("How to Build a Site")).toBe("How to Build a Site");
  });
});
