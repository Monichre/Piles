import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useStore } from "zustand";

import type { FileMeta, GroupModel, ItemLayout, Point } from "../shared/types";
import { CanvasItem } from "./CanvasItem";
import { PileCard } from "./PileCard";
import { getStore } from "./store";
import { defaultPositionForIndex } from "./useDrag";
import { useDrag } from "./useDrag";
import { pointInRect, rectFromPoints, useSelection } from "./useSelection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 3000;

// Z-index budget: pile backgrounds render below items.
const PILE_BASE_Z = 10;
const ITEM_BASE_Z = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a map of default (auto-grid) positions for all items that don't have
 * a saved layout. Items with a layout are not included.
 */
function buildDefaultPositions(
  items: FileMeta[],
  itemLayouts: Record<string, ItemLayout>
): Record<string, Point> {
  const defaults: Record<string, Point> = {};
  let gridIndex = 0;
  for (const item of items) {
    if (!itemLayouts[item.id]) {
      defaults[item.id] = defaultPositionForIndex(gridIndex);
      gridIndex++;
    }
  }
  return defaults;
}

/**
 * Translate a page-relative pointer event into a canvas-relative point,
 * accounting for the canvas element's scroll offset.
 */
function toCanvasPoint(
  e: { clientX: number; clientY: number },
  canvasEl: HTMLDivElement
): Point {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: e.clientX - rect.left + canvasEl.scrollLeft,
    y: e.clientY - rect.top + canvasEl.scrollTop,
  };
}

/**
 * Returns the groupId of the first pile that contains the given canvas point,
 * or null if the point is not inside any pile.
 */
function hitTestGroups(
  point: Point,
  groups: Record<string, GroupModel>
): string | null {
  for (const group of Object.values(groups)) {
    const rect = {
      x: group.position.x,
      y: group.position.y,
      width: group.size.width,
      height: group.collapsed ? 36 : group.size.height,
    };
    if (pointInRect(point, rect)) {
      return group.id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Canvas() {
  const store = useMemo(() => getStore(), []);

  const items = useStore(store, (s) => s.items);
  const itemLayouts = useStore(
    store,
    (s) => s.workspace?.itemLayouts ?? ({} as Record<string, ItemLayout>)
  );
  const groups = useStore(
    store,
    (s) => s.workspace?.groups ?? ({} as Record<string, GroupModel>)
  );
  const updateItemLayouts = useStore(store, (s) => s.updateItemLayouts);
  const saveWorkspace = useStore(store, (s) => s.saveWorkspace);
  const updateGroup = useStore(store, (s) => s.updateGroup);
  const addItemToGroup = useStore(store, (s) => s.addItemToGroup);
  const removeItemFromGroup = useStore(store, (s) => s.removeItemFromGroup);

  const canvasRef = useRef<HTMLDivElement>(null);

  const selection = useSelection();
  const drag = useDrag();

  // Pre-compute default positions for items without a saved layout.
  const defaultPositions = useMemo(
    () => buildDefaultPositions(items, itemLayouts),
    [items, itemLayouts]
  );

  // Ref that mirrors selection.selectedIds so event handlers can read the
  // post-toggle state synchronously before React flushes the state update.
  const selectionRef = useRef<ReadonlySet<string>>(selection.selectedIds);
  useEffect(() => {
    selectionRef.current = selection.selectedIds;
  }, [selection.selectedIds]);

  // ── Pointer down on item ─────────────────────────────────────────────────

  const handleItemPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>, id: string) => {
      // Only handle primary button.
      if (e.button !== 0) return;

      e.stopPropagation(); // prevent canvas receiving the same event

      // Apply selection action and update the ref immediately so startDrag
      // reads the post-toggle set without waiting for a React re-render.
      if (e.shiftKey) {
        const next = new Set(selectionRef.current);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        selectionRef.current = next;
        selection.setSelectedIds(next);
      } else if (!selectionRef.current.has(id)) {
        selectionRef.current = new Set([id]);
        selection.selectOne(id);
      }
      // If already selected (without shift), don't deselect — allow dragging.

      // Begin drag — capture the pointer so moves/ups are received even if
      // the pointer leaves the item element.
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      (e.target as Element).setPointerCapture(e.pointerId);

      const pointerStart = toCanvasPoint(e, canvasEl);

      drag.startDrag({
        itemId: id,
        pointerStart,
        selectedIds: selectionRef.current,
        itemLayouts,
        defaultPositions,
      });
    },
    [selection, drag, itemLayouts, defaultPositions]
  );

  // ── Pointer down on canvas (empty area → marquee or deselect) ────────────

  const handleCanvasPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Only if the event target is the canvas itself (not an item).
      if ((e.target as Element) !== canvasRef.current) return;

      selection.deselectAll();

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      canvasEl.setPointerCapture(e.pointerId);
      const pt = toCanvasPoint(e, canvasEl);
      selection.startMarquee(pt);
    },
    [selection]
  );

  // ── Pointer move ──────────────────────────────────────────────────────────

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const pt = toCanvasPoint(e, canvasEl);

      if (drag.isDragging) {
        drag.moveDrag(pt);
        return;
      }

      if (selection.marquee !== null) {
        selection.updateMarquee(pt);
      }
    },
    [drag, selection]
  );

  // ── Pointer up ────────────────────────────────────────────────────────────

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      if (drag.isDragging) {
        const dropPoint = toCanvasPoint(e, canvasEl);
        const result = drag.endDrag();
        if (result) {
          // Determine if items were dropped on a pile.
          const targetGroupId = hitTestGroups(dropPoint, groups);

          // Build the layout updates for all dragged items.
          const updates: Record<string, Partial<ItemLayout>> = {};
          for (const [id, position] of Object.entries(result.positions)) {
            updates[id] = {
              id,
              position,
              groupId: itemLayouts[id]?.groupId ?? null,
              zIndex: result.newZIndex,
            };
          }
          updateItemLayouts(updates);

          // Apply group membership changes based on drop target.
          if (targetGroupId) {
            for (const id of Object.keys(result.positions)) {
              addItemToGroup(id, targetGroupId);
            }
          } else {
            // Dropped on empty canvas — remove from any group.
            for (const id of Object.keys(result.positions)) {
              const currentGroupId = itemLayouts[id]?.groupId ?? null;
              if (currentGroupId) {
                removeItemFromGroup(id);
              }
            }
          }

          // Persist asynchronously — don't block the pointer event.
          void saveWorkspace();
        }
        return;
      }

      if (selection.marquee !== null) {
        const finalRect = selection.commitMarquee();
        if (finalRect && (finalRect.width > 4 || finalRect.height > 4)) {
          // Select all items whose position falls within the marquee.
          const hit = new Set<string>();
          for (const item of items) {
            const pos =
              itemLayouts[item.id]?.position ??
              defaultPositions[item.id] ??
              { x: 0, y: 0 };
            // Use item center (48×40 is half of 96×80).
            const center: Point = { x: pos.x + 48, y: pos.y + 40 };
            if (pointInRect(center, finalRect)) {
              hit.add(item.id);
            }
          }
          selection.setSelectedIds(hit);
        }
        // No else needed — tiny drag treated as a click.
        // deselectAll() was already called on pointer down.
      }
    },
    [
      drag,
      selection,
      items,
      groups,
      itemLayouts,
      defaultPositions,
      updateItemLayouts,
      addItemToGroup,
      removeItemFromGroup,
      saveWorkspace,
    ]
  );

  // Release pointer capture on pointer cancel.
  const handlePointerCancel = useCallback(() => {
    if (drag.isDragging) {
      drag.endDrag();
    }
    if (selection.marquee !== null) {
      selection.commitMarquee();
    }
  }, [drag, selection]);

  // ── Keyboard deselect ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        selection.deselectAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selection]);

  // ── Pile action callbacks ─────────────────────────────────────────────────

  const handlePileMove = useCallback(
    (groupId: string, newPosition: Point) => {
      updateGroup(groupId, { position: newPosition });
    },
    [updateGroup]
  );

  const handlePileResize = useCallback(
    (groupId: string, newSize: { width: number; height: number }) => {
      updateGroup(groupId, { size: newSize });
    },
    [updateGroup]
  );

  const handlePileRename = useCallback(
    (groupId: string, newName: string) => {
      updateGroup(groupId, { name: newName });
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace]
  );

  const handlePileCollapse = useCallback(
    (groupId: string, collapsed: boolean) => {
      updateGroup(groupId, { collapsed });
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace]
  );

  const handlePileDelete = useCallback(
    (groupId: string) => {
      store.getState().deleteGroup(groupId);
      void saveWorkspace();
    },
    [store, saveWorkspace]
  );

  // ── Build per-pile member lists ───────────────────────────────────────────

  const itemsById = useMemo(() => {
    const map: Record<string, FileMeta> = {};
    for (const item of items) {
      map[item.id] = item;
    }
    return map;
  }, [items]);

  // ── Render ────────────────────────────────────────────────────────────────

  const canvasStyle: CSSProperties = {
    position: "relative",
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    flexShrink: 0,
  };

  const marqueeStyle: CSSProperties | undefined =
    selection.marquee
      ? {
          position: "absolute",
          left: selection.marquee.x,
          top: selection.marquee.y,
          width: selection.marquee.width,
          height: selection.marquee.height,
          border: "1px dashed rgba(142, 203, 255, 0.7)",
          background: "rgba(142, 203, 255, 0.07)",
          pointerEvents: "none",
          zIndex: 9999,
        }
      : undefined;

  return (
    <div
      className="canvas-scroll"
      ref={canvasRef}
      style={{ flex: 1, overflow: "auto" }}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className="canvas-surface" style={canvasStyle}>
        {/* Pile backgrounds — rendered below items */}
        {Object.values(groups).map((group, idx) => {
          const members = group.itemIds
            .map((id) => itemsById[id])
            .filter((item): item is FileMeta => item !== undefined);

          return (
            <PileCard
              key={group.id}
              group={group}
              members={members}
              zIndex={PILE_BASE_Z + idx}
              onMove={handlePileMove}
              onResize={handlePileResize}
              onRename={handlePileRename}
              onCollapse={handlePileCollapse}
              onDelete={handlePileDelete}
              onItemPointerDown={handleItemPointerDown}
            />
          );
        })}

        {/* Canvas items — render items NOT inside a pile at their absolute positions */}
        {items
          .filter((item) => !(itemLayouts[item.id]?.groupId))
          .map((item) => {
            // Drag override takes priority, then saved layout, then default.
            const position =
              drag.dragPositions[item.id] ??
              itemLayouts[item.id]?.position ??
              defaultPositions[item.id] ??
              { x: 0, y: 0 };

            const zIndex = drag.dragPositions[item.id]
              ? 9998 // Float dragged items below the marquee overlay
              : (ITEM_BASE_Z + (itemLayouts[item.id]?.zIndex ?? 0));

            return (
              <CanvasItem
                key={item.id}
                item={item}
                position={position}
                zIndex={zIndex}
                selected={selection.selectedIds.has(item.id)}
                onPointerDown={handleItemPointerDown}
              />
            );
          })}

        {marqueeStyle && <div style={marqueeStyle} aria-hidden="true" />}
      </div>
    </div>
  );
}
