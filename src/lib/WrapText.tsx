import {
  type LayoutCursor,
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
} from "@chenglou/pretext";
import { createSignal, For, onCleanup, onMount } from "solid-js";

const GAP = 20;

const TEXT =
  "The Looter hoards systems, not gold. A combat clock from one game, a " +
  "travel ritual from another, a reaction roll filed off some dead supplement " +
  "— each yoinked, dented, and bolted onto the next. The pile only matters " +
  "once it moves: when a player asks what happens and the borrowed parts " +
  "answer in one voice. Most kitbashes never reach that point. This one " +
  "might, on a good night, with the right table, after the third coffee and " +
  "one truly terrible idea.";

type Line = { text: string; x: number; y: number };

/**
 * Demo: flow a paragraph around a floated illustration with pretext. Each line
 * is laid out off-DOM at a width that narrows while it overlaps the figure,
 * then positioned absolutely — no CSS float, exact control over the wrap.
 * Loaded only where it's used (an Astro island), so pretext stays out of every
 * other bundle.
 */
export function WrapText() {
  const [lines, setLines] = createSignal<Line[]>([]);
  const [height, setHeight] = createSignal(0);

  let root!: HTMLDivElement;
  let figure!: HTMLElement;
  let ro: ResizeObserver | undefined;

  const layout = () => {
    const colWidth = root.clientWidth;
    if (!colWidth) return;
    const cs = getComputedStyle(root);
    const size = parseFloat(cs.fontSize);
    const font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const lh = parseFloat(cs.lineHeight) || size * 1.6;

    const figWidth = figure.offsetWidth + GAP;
    const figBottom = figure.offsetHeight + GAP;

    const prepared = prepareWithSegments(TEXT, font);
    const out: Line[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    for (;;) {
      const width = y < figBottom ? colWidth - figWidth : colWidth;
      const range = layoutNextLineRange(prepared, cursor, width);
      if (range === null) break;
      out.push({ text: materializeLineRange(prepared, range).text, x: 0, y });
      cursor = range.end;
      y += lh;
    }
    setLines(out);
    setHeight(y);
  };

  onMount(() => {
    if (document.fonts.status === "loaded") layout();
    else void document.fonts.ready.then(layout);
    ro = new ResizeObserver(layout);
    ro.observe(root);
  });
  onCleanup(() => ro?.disconnect());

  return (
    <div
      ref={root}
      class="font-text text-neu-800 dark:text-neu-300 relative text-lg leading-relaxed"
      style={{ height: `${height()}px` }}
    >
      <figure
        ref={figure}
        class="border-neu-300 bg-neu-50 dark:border-neu-700 dark:bg-neu-900 absolute top-1 right-0 m-0 flex h-[150px] w-[150px] flex-col items-center justify-center gap-2 rounded border p-3"
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" class="text-accent-600 h-20 w-20">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          />
          <path
            d="M50 16 L80 66 L20 66 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linejoin="round"
          />
          <circle cx="50" cy="54" r="6" fill="currentColor" />
        </svg>
        <figcaption class="text-neu-500 text-xs">fig. 1 — the sigil</figcaption>
      </figure>

      <p class="sr-only">{TEXT}</p>
      <div aria-hidden="true">
        <For each={lines()}>
          {(l) => (
            <span
              style={{
                position: "absolute",
                left: `${l.x}px`,
                top: `${l.y}px`,
                "white-space": "pre",
              }}
            >
              {l.text}
            </span>
          )}
        </For>
      </div>
    </div>
  );
}
