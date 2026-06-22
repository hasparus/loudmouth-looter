import { describe, expect, test } from "bun:test";

import { parse, tokenizeText } from "./tree";

describe("tokenizeText", () => {
  test("splits text, em, bold, links and images", () => {
    expect(tokenizeText("plain")).toEqual(["plain"]);
    expect(tokenizeText("a _em_ b")).toEqual(["a ", { em: "em" }, " b"]);
    expect(tokenizeText("a *em* b")).toEqual(["a ", { em: "em" }, " b"]);
    expect(tokenizeText("a **bold** b")).toEqual([
      "a ",
      { strong: "bold" },
      " b",
    ]);
    expect(tokenizeText("a __bold__ b")).toEqual([
      "a ",
      { strong: "bold" },
      " b",
    ]);
    expect(tokenizeText("see [docs](/x)")).toEqual([
      "see ",
      { link: "docs", href: "/x" },
    ]);
    expect(tokenizeText("![alt](/i.png)")).toEqual([
      { img: "alt", href: "/i.png" },
    ]);
  });

  test("bold wins over em so ** is not two stray ems", () => {
    expect(tokenizeText("**you**")).toEqual([{ strong: "you" }]);
  });
});

describe("parse", () => {
  const tree = parse(
    [
      "@root start",
      "== start",
      "Hi [[the Looter | who? | my _alter ego_]] here.",
      '- "bold **yes**" -> next',
      "== next",
      "Bye.",
    ].join("\n"),
  );

  test("uses @root and indexes nodes", () => {
    expect(tree.root).toBe("start");
    expect(Object.keys(tree.nodes)).toEqual(["start", "next"]);
  });

  test("parses [[ ]] expansion with tokenized inner prose", () => {
    expect(tree.nodes.start!.say).toEqual([
      "Hi ",
      {
        base: "the Looter",
        q: "who?",
        into: ["my ", { em: "alter ego" }],
      },
      " here.",
    ]);
  });

  test("tokenizes answer labels (bold included)", () => {
    expect(tree.nodes.start!.answers).toEqual([
      { say: ["bold ", { strong: "yes" }], to: "next" },
    ]);
  });
});
