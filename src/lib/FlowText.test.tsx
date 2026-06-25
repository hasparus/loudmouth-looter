import { describe, expect, test } from "bun:test";

import { tokenize } from "./FlowText";
import { parseInline } from "./tree";

describe("tokenize", () => {
  test("punctuation after an expandable hugs it (no leading gap)", () => {
    const toks = tokenize(parseInline("of [[the Looter | who | the Looter, my ego]], a collection"));
    const kinds = toks.map((t) => `${t.kind}:${t.text}:${t.spaceBefore ? "_" : ""}`);
    expect(kinds).toEqual([
      "text:of:",
      "expand:the Looter:_",
      "text:,:",
      "text:a:_",
      "text:collection:_",
    ]);
    expect(toks[1]!.expanded).toBe("the Looter, my ego");
  });

  test("first token never carries a leading gap", () => {
    expect(tokenize(parseInline("hello world"))[0]!.spaceBefore).toBe(false);
  });
});
