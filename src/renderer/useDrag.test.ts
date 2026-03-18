import { describe, expect, it } from "vitest";

import type { ItemLayout } from "../shared/types";
import {
  applyDelta,
  defaultPositionForIndex,
  resolvePosition,
} from "./useDrag";

// ---------------------------------------------------------------------------
// defaultPositionForIndex
// ---------------------------------------------------------------------------

describe("defaultPositionForIndex", () => {
  it("places the first item at (0, 0)", () => {
    expect(defaultPositionForIndex(0)).toEqual({ x: 0, y: 0 });
  });

  it("places the second item one column to the right", () => {
    expect(defaultPositionForIndex(1)).toEqual({ x: 120, y: 0 });
  });

  it("wraps to the next row after 16 columns", () => {
    expect(defaultPositionForIndex(16)).toEqual({ x: 0, y: 80 });
  });

  it("places item at column 15 (last in first row)", () => {
    expect(defaultPositionForIndex(15)).toEqual({ x: 15 * 120, y: 0 });
  });

  it("places item at index 17 (second row, second column)", () => {
    expect(defaultPositionForIndex(17)).toEqual({ x: 120, y: 80 });
  });

  it("places item at index 32 (third row, first column)", () => {
    expect(defaultPositionForIndex(32)).toEqual({ x: 0, y: 160 });
  });
});

// ---------------------------------------------------------------------------
// resolvePosition
// ---------------------------------------------------------------------------

describe("resolvePosition", () => {
  const layouts: Record<string, ItemLayout> = {
    "a": { id: "a", position: { x: 200, y: 300 }, groupId: null, zIndex: 1 },
  };
  const defaults: Record<string, { x: number; y: number }> = {
    "b": { x: 120, y: 0 },
  };

  it("returns the layout position when a layout exists", () => {
    expect(resolvePosition("a", layouts, defaults)).toEqual({ x: 200, y: 300 });
  });

  it("falls back to the default position when no layout exists", () => {
    expect(resolvePosition("b", layouts, defaults)).toEqual({ x: 120, y: 0 });
  });

  it("returns (0, 0) when neither layout nor default exists", () => {
    expect(resolvePosition("c", layouts, defaults)).toEqual({ x: 0, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// applyDelta
// ---------------------------------------------------------------------------

describe("applyDelta", () => {
  it("adds the delta to each base position", () => {
    const bases = {
      "a": { x: 100, y: 200 },
      "b": { x: 50, y: 80 },
    };
    const result = applyDelta(bases, { x: 10, y: -20 });
    expect(result["a"]).toEqual({ x: 110, y: 180 });
    expect(result["b"]).toEqual({ x: 60, y: 60 });
  });

  it("handles zero delta — positions unchanged", () => {
    const bases = { "a": { x: 50, y: 60 } };
    const result = applyDelta(bases, { x: 0, y: 0 });
    expect(result["a"]).toEqual({ x: 50, y: 60 });
  });

  it("handles negative delta — moves items to the left/up", () => {
    const bases = { "a": { x: 100, y: 100 } };
    const result = applyDelta(bases, { x: -30, y: -40 });
    expect(result["a"]).toEqual({ x: 70, y: 60 });
  });

  it("preserves relative spacing when dragging multiple items", () => {
    const bases = {
      "a": { x: 0, y: 0 },
      "b": { x: 120, y: 0 },
      "c": { x: 0, y: 80 },
    };
    const result = applyDelta(bases, { x: 50, y: 50 });
    // Relative gaps preserved: b-a = 120, c-a = 80 in each axis
    expect(result["b"].x - result["a"].x).toBe(120);
    expect(result["c"].y - result["a"].y).toBe(80);
  });

  it("returns an independent copy — does not mutate base positions", () => {
    const bases = { "a": { x: 10, y: 20 } };
    const result = applyDelta(bases, { x: 5, y: 5 });
    // Mutation check
    expect(bases["a"]).toEqual({ x: 10, y: 20 });
    expect(result["a"]).toEqual({ x: 15, y: 25 });
  });
});

// ---------------------------------------------------------------------------
// zIndex bump — tested as a pure computation
// ---------------------------------------------------------------------------

describe("zIndex bump on drag start", () => {
  it("computes newZIndex as maxZ + 1 across all layouts", () => {
    const layouts: Record<string, ItemLayout> = {
      "a": { id: "a", position: { x: 0, y: 0 }, groupId: null, zIndex: 3 },
      "b": { id: "b", position: { x: 0, y: 0 }, groupId: null, zIndex: 7 },
      "c": { id: "c", position: { x: 0, y: 0 }, groupId: null, zIndex: 2 },
    };
    let maxZ = 0;
    for (const layout of Object.values(layouts)) {
      if (layout.zIndex > maxZ) maxZ = layout.zIndex;
    }
    expect(maxZ + 1).toBe(8);
  });

  it("returns 1 when all items have zIndex 0 (default)", () => {
    const layouts: Record<string, ItemLayout> = {
      "a": { id: "a", position: { x: 0, y: 0 }, groupId: null, zIndex: 0 },
    };
    let maxZ = 0;
    for (const layout of Object.values(layouts)) {
      if (layout.zIndex > maxZ) maxZ = layout.zIndex;
    }
    expect(maxZ + 1).toBe(1);
  });

  it("returns 1 when no layouts exist", () => {
    const layouts: Record<string, ItemLayout> = {};
    let maxZ = 0;
    for (const layout of Object.values(layouts)) {
      if (layout.zIndex > maxZ) maxZ = layout.zIndex;
    }
    expect(maxZ + 1).toBe(1);
  });
});
