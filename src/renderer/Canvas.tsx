import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useStore } from "zustand";

import type { FileMeta, GroupModel, ItemLayout, Point } from "../shared/types";
import { buildFallbackPositions } from "./canvas-layout";
import { CanvasItem, ITEM_HEIGHT, ITEM_WIDTH } from "./CanvasItem";
import { InspectorPanel } from "./InspectorPanel";
import { PileCard } from "./PileCard";
import { getItemTone, type ItemTone } from "./presentation";
import { getStore } from "./store";
import { defaultPositionForIndex } from "./useDrag";
import { useDrag } from "./useDrag";
import { pointInRect, rectFromPoints, useSelection } from "./useSelection";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 3000;

// Z-index budget. The two arithmetic bases mirror the named tokens in
// tokens.css (--z-pile, --z-item) and must stay in sync with them; they live
// here as numbers because they participate in JS arithmetic (+ idx, + the
// saved relative zIndex). The fixed layers — drag, marquee, context menu —
// are consumed directly as var(--z-drag) / var(--z-overlay) / var(--z-menu)
// so there is no numeric copy to drift. See the "Z scale" block in tokens.css
// for the full ordering rationale.
const PILE_BASE_Z = 100; // mirrors --z-pile
const ITEM_BASE_Z = 200; // mirrors --z-item
/** A dragged card floats above every resting card but below the marquee. */
const DRAG_Z = "var(--z-drag)";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Translate a page-relative pointer event into a canvas-relative point,
 * accounting for the canvas element's scroll offset.
 */
function toCanvasPoint(
  e: { clientX: number; clientY: number },
  canvasEl: HTMLDivElement,
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
  groups: Record<string, GroupModel>,
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Canvas({ filterTone = null }: { filterTone?: ItemTone | null } = {}) {
  const store = useMemo(() => getStore(), []);

  const items = useStore(store, (s) => s.items);
  const itemLayouts = useStore(
    store,
    (s) => s.workspace?.itemLayouts ?? ({} as Record<string, ItemLayout>),
  );
  const groups = useStore(
    store,
    (s) => s.workspace?.groups ?? ({} as Record<string, GroupModel>),
  );
  const createGroup = useStore(store, (s) => s.createGroup);
  const updateItemLayouts = useStore(store, (s) => s.updateItemLayouts);
  const saveWorkspace = useStore(store, (s) => s.saveWorkspace);
  const updateGroup = useStore(store, (s) => s.updateGroup);
  const addItemToGroup = useStore(store, (s) => s.addItemToGroup);
  const removeItemFromGroup = useStore(store, (s) => s.removeItemFromGroup);
  const openItem = useStore(store, (s) => s.openItem);
  const revealItem = useStore(store, (s) => s.revealItem);
  const renameItem = useStore(store, (s) => s.renameItem);
  const trashItem = useStore(store, (s) => s.trashItem);

  const canvasRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const selection = useSelection();
  const drag = useDrag();
  const [renameRequest, setRenameRequest] = useState<{
    itemId: string;
    token: number;
  } | null>(null);
  const [hoverDropGroupId, setHoverDropGroupId] = useState<string | null>(null);

  // Pre-compute default positions for items without a saved layout.
  const defaultPositions = useMemo(
    () => buildFallbackPositions(items, itemLayouts),
    [items, itemLayouts],
  );

  // Ref that mirrors selection.selectedIds so event handlers can read the
  // post-toggle state synchronously before React flushes the state update.
  const selectionRef = useRef<ReadonlySet<string>>(selection.selectedIds);
  useEffect(() => {
    selectionRef.current = selection.selectedIds;
  }, [selection.selectedIds]);

  const selectedIds = useMemo(
    () => Array.from(selection.selectedIds),
    [selection.selectedIds],
  );

  const itemsById = useMemo(() => {
    const map: Record<string, FileMeta> = {};
    for (const item of items) {
      map[item.id] = item;
    }
    return map;
  }, [items]);

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => itemsById[id])
        .filter((item): item is FileMeta => item !== undefined),
    [itemsById, selectedIds],
  );

  const clearSelection = useCallback(() => {
    selectionRef.current = new Set();
    selection.deselectAll();
  }, [selection]);

  const handleCreatePileFromSelection = useCallback(() => {
    if (selectedIds.length === 0) {
      return;
    }

    const selectedPositions = selectedIds.map((id) => {
      return (
        itemLayouts[id]?.position ??
        defaultPositions[id] ?? {
          x: 0,
          y: 0,
        }
      );
    });

    const minX = Math.min(...selectedPositions.map((position) => position.x));
    const minY = Math.min(...selectedPositions.map((position) => position.y));

    createGroup("Pile", selectedIds, {
      x: clamp(minX - 24, 40, CANVAS_WIDTH - 280),
      y: clamp(minY - 24, 40, CANVAS_HEIGHT - 220),
    });

    clearSelection();
    void saveWorkspace();
  }, [
    clearSelection,
    createGroup,
    defaultPositions,
    itemLayouts,
    saveWorkspace,
    selectedIds,
  ]);

  const requestRenameForSelection = useCallback(() => {
    if (selectedIds.length !== 1) {
      return;
    }

    const [itemId] = selectedIds;
    setRenameRequest((current) => ({
      itemId,
      token: current?.itemId === itemId ? current.token + 1 : 1,
    }));
  }, [selectedIds]);

  const handleOpenSelection = useCallback(async () => {
    if (selectedIds.length !== 1) {
      return;
    }

    await openItem(selectedIds[0]);
  }, [openItem, selectedIds]);

  const handleRevealSelection = useCallback(async () => {
    if (selectedIds.length !== 1) {
      return;
    }

    await revealItem(selectedIds[0]);
  }, [revealItem, selectedIds]);

  const handleTrashSelection = useCallback(async () => {
    if (selectedIds.length === 0) {
      return;
    }

    const idsToTrash = [...selectedIds];
    clearSelection();
    for (const id of idsToTrash) {
      await trashItem(id);
    }
  }, [clearSelection, selectedIds, trashItem]);

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
    [selection, drag, itemLayouts, defaultPositions],
  );

  // ── Pointer down on canvas (empty area → marquee or deselect) ────────────

  const handleCanvasPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      const isBlankCanvasHit =
        target === canvasRef.current || target === surfaceRef.current;
      if (!isBlankCanvasHit) return;

      selection.deselectAll();

      const canvasEl = canvasRef.current;
      if (!canvasEl) return;

      canvasEl.setPointerCapture(e.pointerId);
      const pt = toCanvasPoint(e, canvasEl);
      selection.startMarquee(pt);
    },
    [selection],
  );

  // ── Pointer move ──────────────────────────────────────────────────────────

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const pt = toCanvasPoint(e, canvasEl);

      if (drag.isDragging) {
        drag.moveDrag(pt);
        setHoverDropGroupId(hitTestGroups(pt, groups));
        return;
      }

      if (selection.marquee !== null) {
        selection.updateMarquee(pt);
      }
    },
    [drag, groups, selection],
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
          // Determine if items were dropped on a pile BEFORE writing positions.
          const targetGroupId = hitTestGroups(dropPoint, groups);

          // Build the layout updates for all dragged items. Include the correct
          // post-drop groupId in the same update so updateItemLayouts and the
          // group membership calls use consistent state (Issue 2: previously
          // groupId was written with the stale pre-drop value here, then
          // overwritten by a second set() in addItemToGroup/removeItemFromGroup,
          // causing two renders with inconsistent state).
          const updates: Record<string, Partial<ItemLayout>> = {};
          for (const [id, position] of Object.entries(result.positions)) {
            let newGroupId: string | null;
            if (targetGroupId) {
              newGroupId = targetGroupId;
            } else {
              // Dropped on canvas — remove from any group.
              newGroupId = null;
            }
            updates[id] = {
              id,
              position,
              groupId: newGroupId,
              zIndex: result.newZIndex,
            };
          }
          updateItemLayouts(updates);

          // Update the GroupModel.itemIds arrays to stay consistent with the
          // groupId we already wrote above.
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
        setHoverDropGroupId(null);
        return;
      }

      if (selection.marquee !== null) {
        const finalRect = selection.commitMarquee();
        if (finalRect && (finalRect.width > 4 || finalRect.height > 4)) {
          // Select all items whose position falls within the marquee.
          // A filter pill is a visibility control, not just a dimmer: a card
          // whose tone is excluded reads as inert (.ci--dimmed, no pointer
          // events) and must not enter the selection. Without this guard the
          // marquee would silently collect dimmed cards the user cannot then
          // click to remove — the only escape would be Escape/deselect-all.
          const hit = new Set<string>();
          for (const item of items) {
            if (filterTone !== null && getItemTone(item) !== filterTone) {
              continue;
            }
            const pos = itemLayouts[item.id]?.position ??
              defaultPositions[item.id] ?? { x: 0, y: 0 };
            // Use item center, derived from the shared card dimensions so this
            // stays correct if ITEM_WIDTH/ITEM_HEIGHT change again.
            const center: Point = {
              x: pos.x + ITEM_WIDTH / 2,
              y: pos.y + ITEM_HEIGHT / 2,
            };
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
      filterTone,
      updateItemLayouts,
      addItemToGroup,
      removeItemFromGroup,
      saveWorkspace,
    ],
  );

  // Release pointer capture on pointer cancel.
  const handlePointerCancel = useCallback(() => {
    if (drag.isDragging) {
      drag.endDrag();
    }
    setHoverDropGroupId(null);
    if (selection.marquee !== null) {
      selection.commitMarquee();
    }
  }, [drag, selection]);

  // ── Keyboard actions ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) {
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      const currentSelection = Array.from(selectionRef.current);
      if (currentSelection.length === 0) {
        return;
      }

      if (e.key === "F2" && currentSelection.length === 1) {
        e.preventDefault();
        requestRenameForSelection();
        return;
      }

      if (e.key === "Enter" && currentSelection.length === 1) {
        e.preventDefault();
        void handleOpenSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void handleTrashSelection();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    clearSelection,
    handleOpenSelection,
    handleTrashSelection,
    requestRenameForSelection,
  ]);

  // ── Pile action callbacks ─────────────────────────────────────────────────

  const handlePileMove = useCallback(
    (groupId: string, newPosition: Point) => {
      updateGroup(groupId, { position: newPosition });
      // Persist on every move event so position survives app close mid-drag.
      // This fires on every pointermove; acceptable for now.
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace],
  );

  const handlePileResize = useCallback(
    (groupId: string, newSize: { width: number; height: number }) => {
      updateGroup(groupId, { size: newSize });
      // Persist on every resize event so size survives app close mid-drag.
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace],
  );

  const handlePileRename = useCallback(
    (groupId: string, newName: string) => {
      updateGroup(groupId, { name: newName });
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace],
  );

  const handlePileCollapse = useCallback(
    (groupId: string, collapsed: boolean) => {
      updateGroup(groupId, { collapsed });
      void saveWorkspace();
    },
    [updateGroup, saveWorkspace],
  );

  const handlePileDelete = useCallback(
    (groupId: string) => {
      store.getState().deleteGroup(groupId);
      void saveWorkspace();
    },
    [store, saveWorkspace],
  );

  // ── File action callbacks ─────────────────────────────────────────────────

  const handleItemDoubleClick = useCallback(
    (id: string) => {
      void openItem(id);
    },
    [openItem],
  );

  const handleItemReveal = useCallback(
    (id: string) => {
      void revealItem(id);
    },
    [revealItem],
  );

  const handleItemRename = useCallback(
    (id: string, newName: string) => renameItem(id, newName),
    [renameItem],
  );

  const handleItemTrash = useCallback(
    (id: string) => {
      void trashItem(id);
    },
    [trashItem],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const canvasStyle: CSSProperties = {
    position: "relative",
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    flexShrink: 0,
  };

  // Geometry only. The marquee's colour and stacking live in .canvas-marquee,
  // so the last inline colour values leave the renderer.
  const marqueeStyle: CSSProperties | undefined = selection.marquee
    ? {
        left: selection.marquee.x,
        top: selection.marquee.y,
        width: selection.marquee.width,
        height: selection.marquee.height,
      }
    : undefined;

  return (
    <>
      <div
        className="canvas-scroll"
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="canvas-surface" style={canvasStyle} ref={surfaceRef}>
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
                selectedItemIds={selection.selectedIds}
                renameRequest={renameRequest}
                // TODO: GroupModel has no zIndex field; stacking order is
                // determined by insertion order. Add a zIndex field to GroupModel
                // and a "bring to front" action to support user-controlled ordering.
                zIndex={PILE_BASE_Z + idx}
                isDropTarget={hoverDropGroupId === group.id}
                filterTone={filterTone}
                canvasEl={canvasRef.current}
                onMove={handlePileMove}
                onResize={handlePileResize}
                onRename={handlePileRename}
                onCollapse={handlePileCollapse}
                onDelete={handlePileDelete}
                onItemPointerDown={handleItemPointerDown}
                onItemDoubleClick={handleItemDoubleClick}
                onItemReveal={handleItemReveal}
                onItemRename={handleItemRename}
                onItemTrash={handleItemTrash}
              />
            );
          })}

          {/* Canvas items — render items NOT inside a pile at their absolute positions */}
          {items
            .filter((item) => !itemLayouts[item.id]?.groupId)
            .map((item) => {
              // Drag override takes priority, then saved layout, then default.
              const position = drag.dragPositions[item.id] ??
                itemLayouts[item.id]?.position ??
                defaultPositions[item.id] ?? { x: 0, y: 0 };

              const isDragging = Boolean(drag.dragPositions[item.id]);

              const zIndex = isDragging
                ? DRAG_Z // Float dragged items above resting cards, below the marquee
                : ITEM_BASE_Z + (itemLayouts[item.id]?.zIndex ?? 0);

              return (
                <CanvasItem
                  key={item.id}
                  item={item}
                  position={position}
                  zIndex={zIndex}
                  selected={selection.selectedIds.has(item.id)}
                  dragging={isDragging}
                  dimmed={filterTone !== null && getItemTone(item) !== filterTone}
                  renameRequestToken={
                    renameRequest?.itemId === item.id
                      ? renameRequest.token
                      : undefined
                  }
                  onPointerDown={handleItemPointerDown}
                  onDoubleClick={handleItemDoubleClick}
                  onReveal={handleItemReveal}
                  onRename={handleItemRename}
                  onTrash={handleItemTrash}
                />
              );
            })}

          {marqueeStyle && (
            <div
              className="canvas-marquee"
              style={marqueeStyle}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* The inspector is a sibling panel, not an overlay pinned inside the
          scroll container. Sitting in the stage's flex row means it no longer
          needs sticky positioning or a high z-index to climb above the board. */}
      <InspectorPanel
        selectedItems={selectedItems}
        onCreatePile={handleCreatePileFromSelection}
        onOpen={() => void handleOpenSelection()}
        onReveal={() => void handleRevealSelection()}
        onRename={requestRenameForSelection}
        onTrash={() => void handleTrashSelection()}
      />
    </>
  );
}
