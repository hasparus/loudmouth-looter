import { describe, expect, test } from "bun:test";

import { resolveTrackProps, TRACK_MAX } from "./track-props";

describe("resolveTrackProps", () => {
  test("value-only → static, fill=value", () => {
    const r = resolveTrackProps({ shape: "circle", value: "3", max: "5" });
    expect(r).toEqual({ shape: "circle", fill: 3, max: 5, interactive: false });
  });

  test("defaultValue-only → interactive", () => {
    const r = resolveTrackProps({
      shape: "square",
      defaultValue: "1",
      max: "4",
    });
    expect(r).toEqual({ shape: "square", fill: 1, max: 4, interactive: true });
  });

  test("both value and defaultValue → static (value wins)", () => {
    const r = resolveTrackProps({
      shape: "rhomb",
      value: "2",
      defaultValue: "5",
      max: "6",
    });
    expect(r.interactive).toBe(false);
    expect(r.fill).toBe(2);
  });

  test("neither value nor defaultValue → fill=0, static", () => {
    const r = resolveTrackProps({ shape: "circle", max: "5" });
    expect(r).toEqual({ shape: "circle", fill: 0, max: 5, interactive: false });
  });

  test("fill clamped to 0 when negative", () => {
    const r = resolveTrackProps({ value: "-5", max: "5" });
    expect(r.fill).toBe(0);
  });

  test("fill clamped to max when over", () => {
    const r = resolveTrackProps({ value: "99", max: "5" });
    expect(r.fill).toBe(5);
  });

  test("max clamped to TRACK_MAX when over", () => {
    const r = resolveTrackProps({ value: "1", max: "999" });
    expect(r.max).toBe(TRACK_MAX);
    expect(r.fill).toBe(1);
  });

  test("max clamped to 1 when 0", () => {
    const r = resolveTrackProps({ value: "0", max: "0" });
    expect(r.max).toBe(1);
  });

  test("NaN max falls back to 1", () => {
    const r = resolveTrackProps({ value: "1", max: "not-a-number" });
    expect(r.max).toBe(1);
  });

  test("non-numeric value string → fill=0", () => {
    const r = resolveTrackProps({ value: "abc", max: "5" });
    expect(r.fill).toBe(0);
  });

  test("unknown shape falls back to square", () => {
    const r = resolveTrackProps({ shape: "triangle", value: "1", max: "3" });
    expect(r.shape).toBe("square");
  });

  test("missing shape falls back to square", () => {
    const r = resolveTrackProps({ value: "1", max: "3" });
    expect(r.shape).toBe("square");
  });
});
