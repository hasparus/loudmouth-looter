import {
  type PreparedRichInline,
  prepareRichInline,
  type RichInlineItem,
  walkRichInlineLineRanges,
} from "@chenglou/pretext/rich-inline";
import { slotText, type SlotTextController } from "slot-text";
import { createSignal, For, type JSX, onCleanup, onMount } from "solid-js";

import { SLOT_TEXT_OPTIONS } from "./animations";
import { inlineToText, OPEN, TRIGGER } from "./Dialogue";
import type { Inline } from "./tree";

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

type Kind = "text" | "em" | "strong" | "link" | "expand" | "node";
type Token = {
  kind: Kind;
  /** Visible (collapsed) word. */
  text: string;
  /** A space separates this token from the previous one. */
  spaceBefore: boolean;
  expanded?: string;
  href?: string;
  node?: string;
  q?: string;
};
type Pos = { x: number; y: number; w: number };

/** Split prose into per-word tokens, tracking real inter-word whitespace so
 *  punctuation that hugs the expandable (`]],`) stays glued to it. */
export function tokenize(say: Inline[]): Token[] {
  const toks: Token[] = [];
  let prevSpace = true;
  const words = (s: string, kind: Kind, extra?: Partial<Token>) => {
    for (const m of s.matchAll(/(\s+)|(\S+)/g)) {
      if (m[1]) prevSpace = true;
      else {
        toks.push({ kind, text: m[2]!, spaceBefore: prevSpace && toks.length > 0, ...extra });
        prevSpace = false;
      }
    }
  };
  for (const part of say) {
    if (typeof part === "string") words(part, "text");
    else if ("em" in part) words(part.em, "em");
    else if ("strong" in part) words(part.strong, "strong");
    else if ("link" in part) words(part.link, "link", { href: part.href });
    else if ("img" in part) words(part.img, "link", { href: part.href });
    else {
      const spaceBefore = prevSpace && toks.length > 0;
      if (Array.isArray(part.into))
        toks.push({
          kind: "expand",
          text: part.base,
          expanded: part.into.map(inlineToText).join(""),
          q: part.q,
          spaceBefore,
        });
      else toks.push({ kind: "node", text: part.base, node: part.into.node, q: part.q, spaceBefore });
      prevSpace = false;
    }
  }
  return toks;
}

type Base = { family: string; size: number };
const fontFor = (kind: Kind, b: Base) =>
  `${kind === "em" ? "italic " : ""}${kind === "strong" ? "600" : "400"} ${b.size}px ${b.family}`;

/** Build pretext items for one state; leading space → inter-word gap. The
 *  expandable is one unbreakable unit so it owns a stable slot in both states.
 *  ponytail: that means a long expanded phrase overflows below ~320px width;
 *  upgrade path is per-word expandable tokens + a non-slot-text reveal. */
function items(toks: Token[], expanded: boolean, b: Base): RichInlineItem[] {
  return toks.map((t) => ({
    text: (t.spaceBefore ? " " : "") + (expanded && t.kind === "expand" ? t.expanded! : t.text),
    font: fontFor(t.kind, b),
    break: t.kind === "expand" || t.kind === "node" ? "never" : "normal",
  }));
}

/** Walk pretext lines into an absolute position per token index. */
function place(prepared: PreparedRichInline, maxWidth: number, lh: number) {
  const pos: Pos[] = [];
  let line = 0;
  walkRichInlineLineRanges(prepared, maxWidth, (range) => {
    let x = 0;
    for (const f of range.fragments) {
      x += f.gapBefore;
      pos[f.itemIndex] = { x, y: line * lh, w: f.occupiedWidth };
      x += f.occupiedWidth;
    }
    line++;
  });
  return { pos, lines: line };
}

/**
 * Renders dialogue prose that contains an inline `[[ ]]` expansion. Lays the
 * whole paragraph out off-DOM with pretext and positions every word
 * absolutely, so opening the expandable glides the words after it to their new
 * spots instead of letting slot-text's growing cells shove them around.
 */
export function FlowText(props: {
  say: Inline[];
  onNav: (node: string) => void;
  trailing?: JSX.Element;
}) {
  // eslint-disable-next-line solid/reactivity -- only the static `reveal` node renders here; say never changes for a mounted instance
  const toks = tokenize(props.say);
  const expandIdx = toks.findIndex((t) => t.kind === "expand");

  const [pos, setPos] = createSignal<Pos[]>([]);
  const [trail, setTrail] = createSignal<Pos | null>(null);
  const [height, setHeight] = createSignal(0);
  const [open, setOpen] = createSignal(false);
  const [glide, setGlide] = createSignal(false);

  let root!: HTMLDivElement;
  let expandEl: HTMLButtonElement | undefined;
  let roll: SlotTextController | undefined;
  let prepCollapsed: PreparedRichInline | undefined;
  let prepExpanded: PreparedRichInline | undefined;
  let lh = 24;
  let ro: ResizeObserver | undefined;

  const dur = () =>
    (SLOT_TEXT_OPTIONS.duration ?? 0) +
    (SLOT_TEXT_OPTIONS.stagger ?? 0) * (toks[expandIdx]?.expanded?.length ?? 0) * 0.5;

  const relayout = (animated: boolean) => {
    const w = root.clientWidth;
    const prep = open() ? prepExpanded : prepCollapsed;
    if (!w || !prep) return;
    const { pos: p, lines } = place(prep, w, lh);
    setGlide(animated);
    setPos(p);
    setHeight(lines * lh);
    const last = p[toks.length - 1];
    setTrail(last ? { x: last.x + last.w, y: last.y, w: 0 } : null);
  };

  onMount(() => {
    const cs = getComputedStyle(root);
    const base: Base = { family: cs.fontFamily, size: parseFloat(cs.fontSize) };
    const lhRaw = parseFloat(cs.lineHeight);
    lh = Number.isFinite(lhRaw) ? lhRaw : base.size * 1.6;

    const build = () => {
      prepCollapsed = prepareRichInline(items(toks, false, base));
      prepExpanded = prepareRichInline(items(toks, true, base));
      relayout(false);
      ro = new ResizeObserver(() => relayout(false));
      ro.observe(root);
    };
    if (document.fonts.status === "loaded") build();
    else void document.fonts.ready.then(build);

    if (expandEl) roll = slotText(expandEl, toks[expandIdx]!.text);
  });
  onCleanup(() => {
    roll?.destroy();
    ro?.disconnect();
  });

  const expand = () => {
    if (open()) return;
    setOpen(true);
    relayout(true);
    roll?.set(toks[expandIdx]!.expanded!, SLOT_TEXT_OPTIONS);
  };

  const styleFor = (i: number): JSX.CSSProperties => {
    const p = pos()[i];
    return {
      position: "absolute",
      top: "0",
      left: "0",
      "line-height": `${lh}px`,
      "white-space": "pre",
      visibility: p ? "visible" : "hidden",
      transform: `translate(${p?.x ?? 0}px, ${p?.y ?? 0}px)`,
      transition: glide() ? `transform ${dur()}ms ${EASE}` : "none",
    };
  };

  return (
    <div
      ref={root}
      class="text-neu-800 dark:text-neu-300 leading-relaxed relative"
      style={{
        height: `${height()}px`,
        transition: glide() ? `height ${dur()}ms ${EASE}` : "none",
      }}
    >
      <For each={toks}>
        {(t, i) => {
          const style = () => styleFor(i());
          if (t.kind === "expand")
            return (
              <button
                ref={expandEl}
                type="button"
                class={open() ? OPEN : TRIGGER}
                style={style()}
                title={t.q}
                aria-expanded={open()}
                onClick={expand}
              >
                {t.text}
              </button>
            );
          if (t.kind === "node")
            return (
              <button
                type="button"
                class={TRIGGER}
                style={style()}
                title={t.q}
                onClick={() => props.onNav(t.node!)}
              >
                {t.text}
              </button>
            );
          if (t.kind === "link")
            return (
              <a href={t.href} class="text-inherit underline decoration-dotted" style={style()}>
                {t.text}
              </a>
            );
          const inner = t.kind === "em" ? <em>{t.text}</em> : t.kind === "strong" ? <strong>{t.text}</strong> : t.text;
          return <span style={style()}>{inner}</span>;
        }}
      </For>
      {props.trailing && (
        <span
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            "line-height": `${lh}px`,
            visibility: trail() ? "visible" : "hidden",
            transform: `translate(${trail()?.x ?? 0}px, ${trail()?.y ?? 0}px)`,
            transition: glide() ? `transform ${dur()}ms ${EASE}` : "none",
          }}
        >
          {props.trailing}
        </span>
      )}
    </div>
  );
}
