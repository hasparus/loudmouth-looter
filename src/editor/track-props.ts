// Framework-free pure module — safe to import from both Astro and browser TS.

export type Shape = "circle" | "rhomb" | "square";

export const TRACK_SHAPES: ReadonlySet<string> = new Set([
  "circle",
  "rhomb",
  "square",
]);

export const TRACK_MAX = 12;

export interface ResolvedTrack {
  shape: Shape;
  fill: number;
  max: number;
  interactive: boolean;
}

export function resolveTrackProps(raw: {
  shape?: unknown;
  value?: unknown;
  defaultValue?: unknown;
  max?: unknown;
  total?: unknown;
  filled?: unknown;
}): ResolvedTrack {
  const shape: Shape = TRACK_SHAPES.has(raw.shape as string)
    ? (raw.shape as Shape)
    : "square";

  const interactive = raw.defaultValue != null && raw.value == null;

  const fillSource = raw.value ?? raw.defaultValue ?? raw.filled;

  const maxVal = Math.min(
    Math.max(Math.trunc(Number(raw.max ?? raw.total) || 1), 1),
    TRACK_MAX,
  );

  const fill = Math.min(Math.max(Number(fillSource) || 0, 0), maxVal);

  return { shape, fill, max: maxVal, interactive };
}
