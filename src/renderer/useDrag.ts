import { useCallback, useRef, useState } from "react";

import type { ItemLayout, Point } from "../shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DragState {
  /** Whether a drag is currently active. */
  isDragging: boolean;
  /**
   * Live position overrides for items being dragged.
   * Key: item id, Value: current canvas-relative position.
   * Empty when not dragging.
   */
  dragPositions: Readonly<Record<string, Point>>;
}

export interface DragStartPayload {
  /** The item that was pointer-downed on. */
  itemId: string;
  /** Canvas-relative pointer position at drag start. */
  pointerStart: Point;
  /** All currently selected item IDs (the drag may move all of them). */
  selectedIds: ReadonlySet<string>;
  /** Current item layouts — used to read baseline positions. */
  itemLayouts: Readonly<Record<string, ItemLayout>>;
  /** Baseline positions for items that have no saved layout. */
  defaultPositions: Readonly<Record<string, Point>>;
}

export interface DragEndResult {
  /** Final positions for all dragged items, keyed by item id. */
  positions: Record<string, Point>;
  /** The maximum zIndex across all items before the drag began, plus one. */
  newZIndex: number;
}

export interface DragActions {
  /** Call from onPointerDown on an item card to initiate a drag. */
  startDrag: (payload: DragStartPayload) => void;
  /**
   * Call from onPointerMove on the canvas surface.
   * Returns the updated drag positions so callers can react, or null if no
   * drag is active.
   */
  moveDrag: (currentPointer: Point) => Record<string, Point> | null;
  /**
   * Call from onPointerUp / onPointerCancel.
   * Clears drag state and returns the final positions + new zIndex for
   * the caller to persist. Returns null if no drag was active.
   */
  endDrag: () => DragEndResult | null;
}

export type UseDragResult = DragState & DragActions;

// ---------------------------------------------------------------------------
// Internal bookkeeping stored in refs (not state, to avoid re-renders)
// ---------------------------------------------------------------------------

interface DragSession {
  /** Pointer position when the drag started. */
  pointerStart: Point;
  /**
   * Baseline positions for each dragged item (where they were when the drag
   * began).
   */
  basePositions: Record<string, Point>;
  /**
   * The zIndex value to assign to dragged items (max existing zIndex + 1).
   */
  newZIndex: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the canvas-relative default position for an item by index. */
export function defaultPositionForIndex(index: number): Point {
  const COLS = 16;
  const COL_W = 120;
  const ROW_H = 80;
  return {
    x: (index % COLS) * COL_W,
    y: Math.floor(index / COLS) * ROW_H,
  };
}

/**
 * Given an item id, its layout map, and a fallback default-positions map,
 * return the item's current canvas position.
 */
export function resolvePosition(
  id: string,
  itemLayouts: Readonly<Record<string, ItemLayout>>,
  defaultPositions: Readonly<Record<string, Point>>
): Point {
  return itemLayouts[id]?.position ?? defaultPositions[id] ?? { x: 0, y: 0 };
}

/**
 * Apply a pointer delta to a set of baseline positions.
 */
export function applyDelta(
  basePositions: Record<string, Point>,
  delta: Point
): Record<string, Point> {
  const result: Record<string, Point> = {};
  for (const [id, base] of Object.entries(basePositions)) {
    result[id] = { x: base.x + delta.x, y: base.y + delta.y };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDrag(): UseDragResult {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPositions, setDragPositions] = useState<Record<string, Point>>({});

  // Session data lives in a ref — it does not need to trigger renders.
  const session = useRef<DragSession | null>(null);
  // Tracks the most-recently-computed drag positions so endDrag can read
  // them synchronously without relying on React's batched state.
  const lastPositions = useRef<Record<string, Point>>({});

  const startDrag = useCallback(
    ({
      itemId,
      pointerStart,
      selectedIds,
      itemLayouts,
      defaultPositions,
    }: DragStartPayload) => {
      // The dragged set is the selection if the item being dragged is part of
      // it, otherwise it's just the single item.
      const draggedIds: Set<string> = selectedIds.has(itemId)
        ? new Set(selectedIds)
        : new Set([itemId]);

      // Snapshot baseline positions.
      const basePositions: Record<string, Point> = {};
      for (const id of draggedIds) {
        basePositions[id] = resolvePosition(id, itemLayouts, defaultPositions);
      }

      // Compute the max zIndex across ALL layouts so dragged items float above.
      let maxZ = 0;
      for (const layout of Object.values(itemLayouts)) {
        if (layout.zIndex > maxZ) maxZ = layout.zIndex;
      }

      session.current = {
        pointerStart,
        basePositions,
        newZIndex: maxZ + 1,
      };

      // Seed drag positions with the current baseline (no movement yet).
      lastPositions.current = { ...basePositions };
      setDragPositions({ ...basePositions });
      setIsDragging(true);
    },
    []
  );

  const moveDrag = useCallback((currentPointer: Point): Record<string, Point> | null => {
    const s = session.current;
    if (!s) return null;

    const delta: Point = {
      x: currentPointer.x - s.pointerStart.x,
      y: currentPointer.y - s.pointerStart.y,
    };

    const updated = applyDelta(s.basePositions, delta);
    lastPositions.current = updated;
    setDragPositions(updated);
    return updated;
  }, []);

  const endDrag = useCallback((): DragEndResult | null => {
    const s = session.current;
    if (!s) return null;

    // Read the final positions from the ref — guaranteed synchronous,
    // unlike a functional state updater which React may batch.
    const captured = lastPositions.current;
    lastPositions.current = {};
    session.current = null;
    setIsDragging(false);
    setDragPositions({});

    return {
      positions: captured,
      newZIndex: s.newZIndex,
    };
  }, []);

  return {
    isDragging,
    dragPositions,
    startDrag,
    moveDrag,
    endDrag,
  };
}
