import { useCallback, useRef, useState } from "react";

import type { Point } from "../shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarqueeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionState {
  /** Set of selected item IDs. */
  selectedIds: ReadonlySet<string>;
  /** Marquee rectangle being drawn, or null when not active. */
  marquee: MarqueeRect | null;
}

export interface SelectionActions {
  /** Select a single item, clearing any prior selection. */
  selectOne: (id: string) => void;
  /** Toggle an item's membership in the current selection (Shift+Click). */
  toggleOne: (id: string) => void;
  /** Clear the entire selection. */
  deselectAll: () => void;
  /** Begin a marquee drag from a canvas-relative start point. */
  startMarquee: (start: Point) => void;
  /** Update the marquee rectangle as the pointer moves. */
  updateMarquee: (current: Point) => void;
  /**
   * Finish the marquee drag. Returns the final MarqueeRect so the caller can
   * determine which items fall inside it. The marquee overlay is cleared.
   */
  commitMarquee: () => MarqueeRect | null;
  /** Replace the entire selection with a new set of IDs. */
  setSelectedIds: (ids: ReadonlySet<string>) => void;
}

export type UseSelectionResult = SelectionState & SelectionActions;

// ---------------------------------------------------------------------------
// Helper: build a normalised rect from two arbitrary points
// ---------------------------------------------------------------------------

export function rectFromPoints(a: Point, b: Point): MarqueeRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Returns true when the given point falls within the marquee rect. */
export function pointInRect(point: Point, rect: MarqueeRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSelection(): UseSelectionResult {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set()
  );
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  // Store the marquee start point in a ref so we don't need it in state.
  const marqueeStart = useRef<Point | null>(null);
  // Mirror the current marquee rect in a ref so commitMarquee can read it
  // synchronously without closing over stale state.
  const marqueeRect = useRef<MarqueeRect | null>(null);

  const selectOne = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const startMarquee = useCallback((start: Point) => {
    const initial: MarqueeRect = { x: start.x, y: start.y, width: 0, height: 0 };
    marqueeStart.current = start;
    marqueeRect.current = initial;
    setMarquee(initial);
  }, []);

  const updateMarquee = useCallback((current: Point) => {
    const start = marqueeStart.current;
    if (!start) return;
    const rect = rectFromPoints(start, current);
    marqueeRect.current = rect;
    setMarquee(rect);
  }, []);

  const commitMarquee = useCallback((): MarqueeRect | null => {
    const finalRect = marqueeRect.current;
    marqueeStart.current = null;
    marqueeRect.current = null;
    setMarquee(null);
    return finalRect;
  }, []); // empty deps — reads from refs, not state

  const setSelectedIdsDirect = useCallback((ids: ReadonlySet<string>) => {
    setSelectedIds(ids);
  }, []);

  return {
    selectedIds,
    marquee,
    selectOne,
    toggleOne,
    deselectAll,
    startMarquee,
    updateMarquee,
    commitMarquee,
    setSelectedIds: setSelectedIdsDirect,
  };
}
