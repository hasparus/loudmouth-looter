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
  name?: string;
}

export function resolveTrackProps(raw: {
  shape?: unknown;
  value?: unknown;
  defaultValue?: unknown;
  max?: unknown;
  name?: unknown;
}): ResolvedTrack {
  const shape: Shape = TRACK_SHAPES.has(raw.shape as string)
    ? (raw.shape as Shape)
    : "square";

  const interactive = raw.defaultValue != null && raw.value == null;

  const fillSource = raw.value ?? raw.defaultValue;

  const maxVal = Math.min(
    Math.max(Math.trunc(Number(raw.max) || 1), 1),
    TRACK_MAX,
  );

  const fill = Math.min(Math.max(Number(fillSource) || 0, 0), maxVal);

  const name = typeof raw.name === "string" ? raw.name : undefined;

  return {
    shape,
    fill,
    max: maxVal,
    interactive,
    ...(name === undefined ? {} : { name }),
  };
}
