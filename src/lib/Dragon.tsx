import {
  type LayoutCursor,
  layoutNextLineRange,
  materializeLineRange,
  prepareWithSegments,
} from "@chenglou/pretext";
import { onCleanup, onMount } from "solid-js";

const TEXT =
  "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, " +
  "consectetur, adipisci velit, sed quia non numquam eius modi tempora " +
  "incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad " +
  "minima veniam, quis nostrum exercitationem ullam corporis suscipit " +
  "laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum " +
  "iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae " +
  "consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?";

const FONT = '15px ui-monospace, "Courier New", monospace';
const LINE_HEIGHT = 26;
const SEGMENTS = 60;
const SEG_DIST = 10;
const SPEED = 0.18;
const PUSH = 6;
const SPRING = 0.015;
const DAMPING = 0.93;
const GLYPHS = "◆◆◇▼█▓▓▒╬╬╫╪╧╤╥║│┃╎::··..".split("");

const segRadius = (i: number) => {
  if (i < 3) return 2.5 - i * 0.15;
  const t = (i - 3) / (SEGMENTS - 3);
  return 2 * (1 - t * t) + 0.2;
};

const cssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
  fallback;

export function Dragon() {
  let canvas!: HTMLCanvasElement;
  let raf = 0;
  let ro: ResizeObserver | undefined;

  onMount(() => {
    const ctx = canvas.getContext("2d")!;
    const accent = cssVar("--color-accent-500", "#ef4444");
    const ink = cssVar("--color-neu-500", "#78716c");

    let hx = new Float32Array(0);
    let hy = new Float32Array(0);
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let chars: string[] = [];
    let count = 0;

    const sx = new Float32Array(SEGMENTS);
    const sy = new Float32Array(SEGMENTS);
    const FRONT = Math.round(SEGMENTS * 0.4);

    let w = 0;
    let h = 0;
    const pointer = { x: 0, y: 0, seen: false };

    const build = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = FONT;

      const bx: number[] = [];
      const by: number[] = [];
      chars = [];
      const padX = 16;
      const maxWidth = w - padX * 2;
      const prepared = prepareWithSegments(TEXT, FONT);
      let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = LINE_HEIGHT;
      for (;;) {
        const range = layoutNextLineRange(prepared, cursor, maxWidth);
        if (range === null) break;
        const text = materializeLineRange(prepared, range).text;
        let x = padX;
        for (const ch of text) {
          const cw = ctx.measureText(ch).width;
          if (ch !== " ") {
            bx.push(x + cw / 2);
            by.push(y);
            chars.push(ch);
          }
          x += cw;
        }
        cursor = range.end;
        y += LINE_HEIGHT;
        if (y > h + LINE_HEIGHT) break;
      }
      count = chars.length;
      hx = Float32Array.from(bx);
      hy = Float32Array.from(by);
      px = Float32Array.from(bx);
      py = Float32Array.from(by);
      vx = new Float32Array(count);
      vy = new Float32Array(count);
      if (!pointer.seen) {
        pointer.x = w / 2;
        pointer.y = h / 2;
      }
      for (let i = 0; i < SEGMENTS; i++) {
        sx[i] = pointer.x;
        sy[i] = pointer.y + i * SEG_DIST;
      }
    };

    const step = () => {
      sx[0]! += (pointer.x - sx[0]!) * SPEED;
      sy[0]! += (pointer.y - sy[0]!) * SPEED;
      for (let i = 1; i < SEGMENTS; i++) {
        const prevX = sx[i - 1]!;
        const prevY = sy[i - 1]!;
        const dx = sx[i]! - prevX;
        const dy = sy[i]! - prevY;
        const d = Math.hypot(dx, dy);
        if (d > SEG_DIST) {
          const k = SEG_DIST / d;
          sx[i] = prevX + dx * k;
          sy[i] = prevY + dy * k;
        }
      }

      for (let n = 0; n < count; n++) {
        const cx = px[n]!;
        const cy = py[n]!;
        let ax = vx[n]!;
        let ay = vy[n]!;
        for (let e = 0; e < FRONT; e++) {
          const r = 14 * segRadius(e) * 0.45 + 10;
          const dx = cx - sx[e]!;
          const dy = cy - sy[e]!;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < r * r && dist2 > 0.01) {
            const dist = Math.sqrt(dist2);
            const force = PUSH * ((r - dist) / r) * segRadius(e);
            ax += (dx / dist) * force;
            ay += (dy / dist) * force;
          }
        }
        ax += (hx[n]! - cx) * SPRING;
        ay += (hy[n]! - cy) * SPRING;
        ax *= DAMPING;
        ay *= DAMPING;
        vx[n] = ax;
        vy[n] = ay;
        px[n] = cx + ax;
        py[n] = cy + ay;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = FONT;
      ctx.fillStyle = ink;
      for (let n = 0; n < count; n++) ctx.fillText(chars[n]!, px[n]!, py[n]!);

      ctx.fillStyle = accent;
      for (let e = SEGMENTS - 1; e >= 0; e--) {
        const size = 14 * segRadius(e);
        ctx.globalAlpha = e < 3 ? 1 : 1 - (e / SEGMENTS) * 0.55;
        ctx.font = `${size}px ui-monospace, "Courier New", monospace`;
        ctx.fillText(GLYPHS[Math.min(e, GLYPHS.length - 1)]!, sx[e]!, sy[e]!);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(step);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.seen = true;
    };

    const start = () => {
      build();
      raf = requestAnimationFrame(step);
    };
    if (document.fonts.status === "loaded") start();
    else void document.fonts.ready.then(start);

    window.addEventListener("pointermove", onMove);
    ro = new ResizeObserver(build);
    ro.observe(canvas);
    onCleanup(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro?.disconnect();
    });
  });

  return (
    <canvas
      ref={canvas}
      class="text-accent-500 h-[420px] w-full touch-none"
      aria-label="A dragon of glyphs that parts the text as it follows your cursor"
    />
  );
}
