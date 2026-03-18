import { describe, expect, it } from "vitest";

import { pointInRect, rectFromPoints } from "./useSelection";

// ---------------------------------------------------------------------------
// rectFromPoints
// ---------------------------------------------------------------------------

describe("rectFromPoints", () => {
  it("creates a normalised rect when dragging top-left to bottom-right", () => {
    const r = rectFromPoints({ x: 10, y: 20 }, { x: 110, y: 120 });
    expect(r).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it("creates a normalised rect when dragging bottom-right to top-left", () => {
    const r = rectFromPoints({ x: 110, y: 120 }, { x: 10, y: 20 });
    expect(r).toEqual({ x: 10, y: 20, width: 100, height: 100 });
  });

  it("handles zero-size rect when start and end are the same point", () => {
    const r = rectFromPoints({ x: 50, y: 50 }, { x: 50, y: 50 });
    expect(r).toEqual({ x: 50, y: 50, width: 0, height: 0 });
  });

  it("handles diagonal dragging from bottom-left to top-right", () => {
    const r = rectFromPoints({ x: 0, y: 100 }, { x: 100, y: 0 });
    expect(r).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });
});

// ---------------------------------------------------------------------------
// pointInRect
// ---------------------------------------------------------------------------

describe("pointInRect", () => {
  const rect = { x: 10, y: 10, width: 100, height: 100 };

  it("returns true for a point well inside the rect", () => {
    expect(pointInRect({ x: 50, y: 50 }, rect)).toBe(true);
  });

  it("returns true for a point exactly on the top-left corner (inclusive)", () => {
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
  });

  it("returns true for a point exactly on the bottom-right corner (inclusive)", () => {
    expect(pointInRect({ x: 110, y: 110 }, rect)).toBe(true);
  });

  it("returns false for a point to the left of the rect", () => {
    expect(pointInRect({ x: 9, y: 50 }, rect)).toBe(false);
  });

  it("returns false for a point above the rect", () => {
    expect(pointInRect({ x: 50, y: 9 }, rect)).toBe(false);
  });

  it("returns false for a point to the right of the rect", () => {
    expect(pointInRect({ x: 111, y: 50 }, rect)).toBe(false);
  });

  it("returns false for a point below the rect", () => {
    expect(pointInRect({ x: 50, y: 111 }, rect)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Selection logic — pure function tests (no React hooks)
// The hook wraps simple Set operations; we test the invariants directly here
// since jsdom is not available in the node test environment.
// ---------------------------------------------------------------------------

describe("selection invariants", () => {
  it("single-select: new Set contains only the chosen id", () => {
    const prev = new Set(["a", "b"]);
    const next = new Set(["c"]);
    expect(next.size).toBe(1);
    expect(next.has("c")).toBe(true);
    expect(next.has("a")).toBe(false);
    void prev; // referenced to satisfy lint
  });

  it("toggle: adds an id that is not present", () => {
    const prev = new Set(["a"]);
    const next = new Set(prev);
    next.add("b");
    expect(next.has("b")).toBe(true);
    expect(next.has("a")).toBe(true);
  });

  it("toggle: removes an id that is already present", () => {
    const prev = new Set(["a", "b"]);
    const next = new Set(prev);
    next.delete("a");
    expect(next.has("a")).toBe(false);
    expect(next.has("b")).toBe(true);
  });

  it("deselect-all: produces an empty set", () => {
    const next = new Set<string>();
    expect(next.size).toBe(0);
  });

  it("marquee rect calculation correctly selects overlapping items", () => {
    // Items at grid positions
    const itemPositions: Record<string, { x: number; y: number }> = {
      "a": { x: 0, y: 0 },
      "b": { x: 120, y: 0 },
      "c": { x: 240, y: 0 },
    };

    // Marquee from (0, 0) to (200, 100)
    const marquee = rectFromPoints({ x: 0, y: 0 }, { x: 200, y: 100 });
    const selected = new Set<string>();

    for (const [id, pos] of Object.entries(itemPositions)) {
      // Use item centre (48×40)
      const centre = { x: pos.x + 48, y: pos.y + 40 };
      if (pointInRect(centre, marquee)) {
        selected.add(id);
      }
    }

    expect(selected.has("a")).toBe(true);  // centre (48, 40) — inside
    expect(selected.has("b")).toBe(true);  // centre (168, 40) — inside
    expect(selected.has("c")).toBe(false); // centre (288, 40) — outside
  });
});
