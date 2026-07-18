import { Index } from "solid-js";

// Primitive atoms shared by the text editor, its slash menu, and the help
// modal. DOM builders produce the live, interactive elements embedded in the

export type Shape = "circle" | "rhomb" | "square";

export interface SlashCommand {
  blockClass?: string;
  defaultCount: number;
  description: string;
  kind: "block" | "track";
  name: string;
  shape?: Shape;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    defaultCount: 3,
    description: "Checkboxes",
    kind: "track",
    name: "squares",
    shape: "square",
  },
  {
    defaultCount: 4,
    description: "Progress / counter",
    kind: "track",
    name: "circles",
    shape: "circle",
  },
  {
    defaultCount: 5,
    description: "Tally marks",
    kind: "track",
    name: "rhombs",
    shape: "rhomb",
  },
  {
    blockClass: "te-arrow",
    defaultCount: 0,
    description: "Arrow line",
    kind: "block",
    name: "arrow",
  },
  {
    blockClass: "te-chevron",
    defaultCount: 0,
    description: "Chevron line",
    kind: "block",
    name: "chevron",
  },
  {
    defaultCount: 0,
    description: "Move card",
    kind: "block",
    name: "move",
  },
];

const MAX_COUNT = 12;

// Each toggle carries role="checkbox" + aria-checked; the label gives it an
// accessible name (a bare checkbox role has none) and lets assistive tech and
// tests tell the three track kinds apart.
export const TOGGLE_LABEL: Record<Shape, string> = {
  circle: "circle",
  rhomb: "rhomb",
  square: "square",
};

export function clampCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value), 1), MAX_COUNT);
}

// Single source of truth for a live toggle's attributes — used both by the
// builder below and by the sanitizer when it rebuilds a toggle from saved HTML.
export function populateToggleElement(
  toggle: HTMLElement,
  shape: Shape,
  checked: boolean,
): void {
  toggle.className = "te-toggle";
  toggle.dataset.shape = shape;
  toggle.setAttribute("type", "button");
  toggle.setAttribute("role", "checkbox");
  toggle.setAttribute("aria-label", TOGGLE_LABEL[shape]);
  toggle.setAttribute("aria-checked", checked ? "true" : "false");
  toggle.setAttribute("contenteditable", "false");
}

// Live, interactive toggle: a real <button> so keyboard users can focus it and
// toggle with Space/Enter (a span carrying role=checkbox is a lie — Space
// would just type a space into the surrounding contenteditable).
export function buildToggleElement(
  shape: Shape,
  filled: boolean,
): HTMLButtonElement {
  const toggle = document.createElement("button");
  populateToggleElement(toggle, shape, filled);
  return toggle;
}

// Opaque MDX atoms: JSX elements, imports/exports, expressions, and
// frontmatter the editor doesn't understand are kept as non-editable chips
// carrying their original MDX source in data-mdx, so opening and saving a
// post never destroys them. data-mdx is inert text — it is only ever fed
// back to the remark serializer, never into innerHTML.
export function jsxAtomLabel(mdx: string): string {
  const trimmed = mdx.trimStart();
  if (trimmed.startsWith("---")) return "frontmatter";
  if (/^(?:import|export)\b/.test(trimmed)) return "import";
  if (trimmed.startsWith("{")) return "expression";
  const name = /^<\s*([A-Za-z][\w.]*)/.exec(trimmed)?.[1];
  return name ? `<${name}>` : "jsx";
}

// Single source of truth for a JSX atom's attributes — used both by the
// builder below and by the sanitizer when it rebuilds one from saved HTML.
export function populateJsxElement(
  el: HTMLElement,
  mdx: string,
  inline: boolean,
): void {
  el.className = inline ? "te-jsx-inline" : "te-jsx";
  el.setAttribute("contenteditable", "false");
  el.dataset.mdx = mdx;
  el.title = mdx;
  el.textContent = "";
  if (inline) {
    // Show the element's text so the surrounding prose still reads naturally
    // (e.g. a <Tooltip>twice</Tooltip> renders as "twice").
    const text = mdx.replaceAll(/<[^>]*>/g, "").trim();
    el.textContent = text || jsxAtomLabel(mdx);
    return;
  }
  const tag = document.createElement("span");
  tag.className = "te-jsx-tag";
  tag.textContent = jsxAtomLabel(mdx);
  el.append(tag);
  const collapsed = mdx.replaceAll(/\s+/g, " ").trim();
  const preview = document.createElement("span");
  preview.className = "te-jsx-preview";
  preview.textContent =
    collapsed.length > 96 ? `${collapsed.slice(0, 96)}…` : collapsed;
  el.append(preview);
}

export function buildJsxElement(mdx: string, inline = false): HTMLElement {
  const el = document.createElement(inline ? "span" : "div");
  populateJsxElement(el, mdx, inline);
  return el;
}

export function buildTrackElement(
  shape: Shape,
  count: number,
): HTMLSpanElement {
  const track = document.createElement("span");
  track.className = "te-track";
  track.setAttribute("contenteditable", "false");
  for (let i = 0; i < clampCount(count); i++) {
    const toggle = buildToggleElement(shape, false);
    // Roving tabindex: only the first toggle is a Tab stop; arrows move within.
    if (i > 0) toggle.tabIndex = -1;
    track.append(toggle);
  }
  return track;
}

interface TrackPreviewProps {
  count: number;
  filled?: number;
  shape: Shape;
}

// Inert illustration for menus and docs — aria-hidden so screen readers get
// the surrounding prose instead of a redundant run of checkbox announcements.
// Toggles here are spans (decorative); the live editor builds them as buttons.
export function TrackPreview(props: TrackPreviewProps) {
  return (
    <span aria-hidden="true" class="te-track" data-preview="1">
      <Index each={Array.from({ length: clampCount(props.count) })}>
        {(_, i) => (
          <span
            aria-checked={i < (props.filled ?? 0) ? "true" : "false"}
            class="te-toggle"
            data-shape={props.shape}
          />
        )}
      </Index>
    </span>
  );
}
