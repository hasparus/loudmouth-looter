import {
  type LayoutCursor,
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
} from "@chenglou/pretext";
import { createSignal, For, onCleanup, onMount } from "solid-js";

type Point = { x: number; y: number };
type Interval = { left: number; right: number };
type Rect = { x: number; y: number; width: number; height: number };

function transformWrapPoints(
  points: Point[],
  rect: Rect,
  angle: number,
): Point[] {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((p) => {
    const lx = (p.x - 0.5) * rect.width;
    const ly = (p.y - 0.5) * rect.height;
    return { x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos };
  });
}

function isPointInPolygon(points: Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!;
    const b = points[j]!;
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function polygonXsAtY(points: Point[], y: number): number[] {
  const xs: number[] = [];
  let a = points.at(-1)!;
  for (const b of points) {
    if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y))
      xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
    a = b;
  }
  return xs.sort((m, n) => m - n);
}

function polygonIntervalForBand(
  points: Point[],
  top: number,
  bottom: number,
  hPad: number,
): Interval | null {
  let left = Infinity;
  let right = -Infinity;
  for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
    const xs = polygonXsAtY(points, y + 0.5);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i]! < left) left = xs[i]!;
      if (xs[i + 1]! > right) right = xs[i + 1]!;
    }
  }
  if (!Number.isFinite(left)) return null;
  return { left: left - hPad, right: right + hPad };
}

function carveSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base];
  for (const iv of blocked) {
    const next: Interval[] = [];
    for (const slot of slots) {
      if (iv.right <= slot.left || iv.left >= slot.right) {
        next.push(slot);
        continue;
      }
      if (iv.left > slot.left) next.push({ left: slot.left, right: iv.left });
      if (iv.right < slot.right)
        next.push({ left: iv.right, right: slot.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= 28);
}

const TEXT =
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium " +
  "doloremque laudantium, totam rem aperiam eaque ipsa quae ab illo inventore " +
  "veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim " +
  "ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia " +
  "consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque " +
  "porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, " +
  "adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore " +
  "et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis " +
  "nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid " +
  "ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea " +
  "voluptate velit esse quam nihil molestiae consequatur, vel illum qui " +
  "dolorem eum fugiat quo voluptas nulla pariatur? At vero eos et accusamus et " +
  "iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum " +
  "deleniti atque corrupti quos dolores et quas molestias excepturi sint " +
  "occaecati cupiditate non provident, similique sunt in culpa qui officia " +
  "deserunt mollitia animi, id est laborum et dolorum fuga.";

const HEX: Point[] = Array.from({ length: 6 }, (_, k) => {
  const a = -Math.PI / 2 + (k * Math.PI) / 3;
  return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) };
});
const TRIANGLE: Point[] = [
  { x: 0.5, y: 0.04 },
  { x: 0.97, y: 0.95 },
  { x: 0.03, y: 0.95 },
];

type ShapeDef = {
  base: Point[];
  fx: number;
  fy: number;
  fw: number;
  fh: number;
};
const SHAPES: ShapeDef[] = [
  { base: TRIANGLE, fx: 0.07, fy: 0.34, fw: 0.26, fh: 0.4 },
  { base: HEX, fx: 0.62, fy: 0.08, fw: 0.28, fh: 0.42 },
];

const GAP = 36;
const HPAD = 12;

/**
 * Minimal recreation of pretext's dynamic-layout demo
 * (https://chenglou.me/pretext/dynamic-layout/), with abstract shapes instead
 * of the OpenAI/Anthropic logos. One continuous text stream fills the left
 * column then resumes in the right, routing around two polygon obstacles. Click
 * a shape to spin it — the text reflows live around the new geometry.
 */
export function Spread() {
  const [lines, setLines] = createSignal<
    { text: string; x: number; y: number }[]
  >([]);
  const [polys, setPolys] = createSignal<Point[][]>([]);

  let root!: HTMLDivElement;
  let ro: ResizeObserver | undefined;
  const angles: number[] = SHAPES.map((_, i) => (i % 2 ? -0.25 : 0.3));
  let anim: number | undefined;

  const layout = () => {
    const W = root.clientWidth;
    const H = root.clientHeight;
    if (!W || !H) return;
    const cs = getComputedStyle(root);
    const size = Number.parseFloat(cs.fontSize);
    const font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const lh = Number.parseFloat(cs.lineHeight) || size * 1.5;

    const shapePolys = SHAPES.map((s, i) =>
      transformWrapPoints(
        s.base,
        { x: s.fx * W, y: s.fy * H, width: s.fw * W, height: s.fh * H },
        angles[i]!,
      ),
    );
    setPolys(shapePolys);

    const colW = (W - GAP) / 2;
    const columns: Interval[] = [
      { left: 0, right: colW },
      { left: colW + GAP, right: W },
    ];

    const prepared = prepareWithSegments(TEXT, font);
    const out: { text: string; x: number; y: number }[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let done = false;
    for (const col of columns) {
      for (let y = 0; y + lh <= H && !done; y += lh) {
        const blocked = shapePolys
          .map((p) => polygonIntervalForBand(p, y, y + lh, HPAD))
          .filter((iv): iv is Interval => iv !== null);
        const slots = carveSlots(col, blocked);
        for (const slot of slots) {
          const range = layoutNextLineRange(
            prepared,
            cursor,
            slot.right - slot.left,
          );
          if (range === null) {
            done = true;
            break;
          }
          out.push({
            text: materializeLineRange(prepared, range).text,
            x: slot.left,
            y,
          });
          cursor = range.end;
        }
      }
      if (done) break;
    }
    setLines(out);
  };

  const spin = (i: number) => {
    const from = angles[i]!;
    const to = from + Math.PI / 2;
    const t0 = performance.now();
    const dur = 480;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      angles[i] = from + (to - from) * (1 - (1 - p) ** 3);
      layout();
      if (p < 1) anim = requestAnimationFrame(tick);
    };
    if (anim) cancelAnimationFrame(anim);
    anim = requestAnimationFrame(tick);
  };

  const onClick = (e: MouseEvent) => {
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = polys().findIndex((p) => isPointInPolygon(p, x, y));
    if (hit !== -1) spin(hit);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const count = polys().length;
    if (count > 0) spin(Math.floor(Math.random() * count));
  };

  onMount(() => {
    if (document.fonts.status === "loaded") layout();
    else void document.fonts.ready.then(layout);
    ro = new ResizeObserver(layout);
    ro.observe(root);
  });
  onCleanup(() => {
    ro?.disconnect();
    if (anim) cancelAnimationFrame(anim);
  });

  const toPath = (p: Point[]) => p.map((q) => `${q.x},${q.y}`).join(" ");

  return (
    <>
      <p class="sr-only">{TEXT}</p>
      <div
        ref={root}
        role="button"
        tabIndex={0}
        aria-label="Rearrange the words"
        onClick={onClick}
        onKeyDown={onKeyDown}
        class="font-text text-neu-800 dark:text-neu-300 relative h-[460px] text-base/relaxed"
      >
        <svg
          class="absolute inset-0 size-full overflow-visible"
          aria-hidden="true"
        >
          <For each={polys()}>
            {(p) => (
              <polygon
                points={toPath(p)}
                class="text-accent-500/15 stroke-accent-500/70 cursor-pointer stroke-[1.5]"
                fill="currentColor"
                stroke="currentColor"
              />
            )}
          </For>
        </svg>

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
    </>
  );
}
