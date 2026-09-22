import { describe, expect, test } from "bun:test";

import { hueFor, readSentences } from "./write-music";

const shape = (text: string) =>
  readSentences(text).map((s) => [s.segment.trim(), s.words] as const);

describe("readSentences", () => {
  test("splits on sentence boundaries and counts words", () => {
    expect(shape("One two three. Four five.")).toEqual([
      ["One two three.", 3],
      ["Four five.", 2],
    ]);
  });

  test("keeps offsets pointing into the original text", () => {
    const sentences = readSentences("Alpha beta. Gamma delta.");
    expect(sentences.map((s) => s.index)).toEqual([0, 12]);
  });

  test("does not break after a question mark inside quotes", () => {
    expect(shape('She asks "which days could work?", not when.')).toEqual([
      ['She asks "which days could work?", not when.', 8],
    ]);
  });

  test("does not break before a dash continuation", () => {
    expect(shape("He stopped. — or so he claimed.")).toEqual([
      ["He stopped. — or so he claimed.", 6],
    ]);
  });

  test("does not break before a lowercase opening quote", () => {
    expect(shape('He shrugged. "whatever," he said.')).toEqual([
      ['He shrugged. "whatever," he said.', 5],
    ]);
  });

  test("still breaks when the next sentence starts a new clause", () => {
    expect(shape('"Which days?" She never answered.')).toEqual([
      ['"Which days?"', 2],
      ["She never answered.", 3],
    ]);
  });

  test("merges a run of false breaks into one sentence", () => {
    expect(shape('"Stop!" (he did), "again?" she sighed.')).toEqual([
      ['"Stop!" (he did), "again?" she sighed.', 6],
    ]);
  });

  test("punctuation and whitespace are not words", () => {
    expect(shape("  Hey —  you!  ")).toEqual([["Hey —  you!", 2]]);
  });

  test("does not break after an abbreviated title", () => {
    expect(shape("Mr. Smith left. Dr. Ross stayed.")).toEqual([
      ["Mr. Smith left.", 3],
      ["Dr. Ross stayed.", 3],
    ]);
  });

  test("does not break inside e.g. or i.e.", () => {
    expect(shape("Pick a day, e.g. Monday. Then tell them.")).toEqual([
      ["Pick a day, e.g. Monday.", 5],
      ["Then tell them.", 3],
    ]);
  });

  test("still breaks after an abbreviation that ends a sentence", () => {
    expect(shape("Bring cats, dogs, etc. Then go home.")).toEqual([
      ["Bring cats, dogs, etc.", 4],
      ["Then go home.", 3],
    ]);
  });

  test("empty text yields nothing", () => {
    expect(readSentences("")).toEqual([]);
  });
});

describe("hueFor", () => {
  test("short sentences are yellow, mid-length red, long cyan", () => {
    expect(hueFor(1)).toBe(60);
    expect(hueFor(4)).toBe(300);
    expect(hueFor(6)).toBe(0);
    expect(hueFor(9)).toBe(120);
    expect(hueFor(13)).toBe(180);
  });

  test("clamps past the longest bucket", () => {
    expect(hueFor(400)).toBe(hueFor(13));
  });
});
