/**
 * Colors sentences by word count to visualize prose rhythm,
 * after Gary Provost's "write music" tip.
 */

import "./write-music.css";

const HUES = [60, 60, 60, 300, 300, 0, 0, 120, 120, 120, 120, 120, 120, 180];

const BLOCK_ELEMENTS = "p, li, h1, h2";
const BLOCKS = `:is(.zaduma-prose, [contenteditable]) :is(${BLOCK_ELEMENTS})`;

const SENTENCES = new Intl.Segmenter("en", { granularity: "sentence" });
const WORDS = new Intl.Segmenter("en", { granularity: "word" });

/**
 * Titles and references that take a name or number after the period.
 * ponytail: abbreviations that often do end a sentence ("etc.", "Inc.")
 * stay out, since merging those is worse than splitting them.
 */
const ABBREVIATION =
  /(?:^|[\s(])(?:mr|mrs|ms|dr|prof|sr|jr|st|rev|gen|vs|cf|fig|figs|e\.g|i\.e)\.$/i;

export interface Sentence {
  index: number;
  segment: string;
  words: number;
}

/**
 * Intl.Segmenter breaks sentences after `?`/`.` inside quotes
 * (…asks “which days could work?”, not…). A segment continuing with a
 * lowercase letter, comma, dash, or an opening quote followed by
 * lowercase belongs to the previous sentence, and so does one following
 * an abbreviation's period.
 */
export function readSentences(text: string): Sentence[] {
  const merged: Sentence[] = [];

  for (const { index, segment } of SENTENCES.segment(text)) {
    const previous = merged.at(-1);
    const head = segment.trimStart().replace(/^[“”"'‘’([]/, "");
    if (
      previous &&
      (/^[\p{Ll}\p{Pd},;)\]]/u.test(head) ||
        ABBREVIATION.test(previous.segment.trimEnd()))
    ) {
      previous.segment += segment;
    } else {
      merged.push({ index, segment, words: 0 });
    }
  }

  for (const sentence of merged) {
    sentence.words = [...WORDS.segment(sentence.segment)].filter(
      (word) => word.isWordLike,
    ).length;
  }

  return merged;
}

export function hueFor(words: number): number {
  return HUES[Math.min(words, HUES.length - 1)]!;
}

let lit = false;
let repaint: number | undefined;

export function toggleWriteMusic(): void {
  if (!("highlights" in CSS)) {
    // eslint-disable-next-line no-console
    console.warn("write-music needs the CSS Custom Highlight API");
    return;
  }

  clear();
  if (lit) {
    lit = false;
    document.removeEventListener("input", schedule);
    document.removeEventListener("paste", schedule);
    return;
  }

  paint();
  lit = true;
  document.addEventListener("input", schedule);
  document.addEventListener("paste", schedule);
}

/** Ranges survive typing, but not a paste or a new paragraph. */
function schedule(): void {
  clearTimeout(repaint);
  repaint = setTimeout(() => {
    clear();
    paint();
  }, 200) as unknown as number;
}

function clear(): void {
  clearTimeout(repaint);
  for (const hue of new Set(HUES)) CSS.highlights.delete(highlightName(hue));
}

function paint(): void {
  const ranges = new Map<number, Range[]>();

  for (const block of document.querySelectorAll(BLOCKS)) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement?.closest(BLOCK_ELEMENTS) === block
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });

    const texts: { node: Text; start: number }[] = [];
    let text = "";
    for (let node; (node = walker.nextNode() as Text | null); ) {
      texts.push({ node, start: text.length });
      text += node.parentElement?.closest("code")
        ? " ".repeat(node.data.length)
        : node.data.replaceAll(/\s/g, " ");
    }

    for (const sentence of readSentences(text)) {
      if (!sentence.words) continue;

      const start = locate(texts, sentence.index);
      const end = locate(
        texts,
        sentence.index + sentence.segment.trimEnd().length,
      );
      if (!start || !end) continue;

      const range = new Range();
      range.setStart(...start);
      range.setEnd(...end);

      const hue = hueFor(sentence.words);
      const bucket = ranges.get(hue);
      if (bucket) bucket.push(range);
      else ranges.set(hue, [range]);
    }
  }

  for (const [hue, rangesForHue] of ranges) {
    CSS.highlights.set(highlightName(hue), new Highlight(...rangesForHue));
  }
}

function highlightName(hue: number) {
  return `write-music-${hue}`;
}

function locate(
  texts: { node: Text; start: number }[],
  offset: number,
): [Text, number] | undefined {
  for (const { node, start } of texts) {
    if (offset <= start + node.data.length) return [node, offset - start];
  }
  return undefined;
}
