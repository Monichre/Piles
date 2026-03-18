import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import type { FileMeta, GroupModel, Point } from "../shared/types";
import { CanvasItem } from "./CanvasItem";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PileCardProps {
  group: GroupModel;
  /** All FileMeta items that belong to this pile (pre-filtered by caller). */
  members: FileMeta[];
  onMove: (groupId: string, newPosition: Point) => void;
  onResize: (groupId: string, newSize: { width: number; height: number }) => void;
  onRename: (groupId: string, newName: string) => void;
  onCollapse: (groupId: string, collapsed: boolean) => void;
  onDelete: (groupId: string) => void;
  onItemPointerDown: (e: PointerEvent<HTMLDivElement>, itemId: string) => void;
  /** Base z-index for the pile background layer. */
  zIndex?: number;
  /**
   * Reference to the scrollable canvas container element. Used to compute
   * canvas-relative pointer positions during header drag, consistent with
   * how Canvas.tsx handles item drag via toCanvasPoint().
   */
  canvasEl: HTMLDivElement | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 36;
const MIN_WIDTH = 160;
const MIN_HEIGHT = 80;
const COLLAPSED_HEIGHT = HEADER_HEIGHT;

// Layout constants for items rendered inside a pile body.
const PILE_GRID_COLS = 2;
const PILE_GRID_CELL_W = 104;
const PILE_GRID_CELL_H = 88;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PileCard = memo(function PileCard({
  group,
  members,
  onMove,
  onResize,
  onRename,
  onCollapse,
  onDelete,
  onItemPointerDown,
  zIndex = 0,
  canvasEl,
}: PileCardProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(group.name);

  // Issue 1: sync draftName when the group name changes externally (e.g. undo
  // or remote update), but only when the input is not currently being edited.
  useEffect(() => {
    if (!editing) setDraftName(group.name);
  }, [group.name, editing]);

  // Drag-to-move state (header drag).
  // startPointer is stored as a canvas-relative point (matching toCanvasPoint()
  // used in Canvas.tsx for item drag) so scroll offsets are handled correctly.
  const moveDragRef = useRef<{
    startPointer: Point;
    startPos: Point;
  } | null>(null);

  // Drag-to-resize state (resize handle)
  const resizeDragRef = useRef<{
    startPointer: Point;
    startSize: { width: number; height: number };
  } | null>(null);

  // ── Inline rename ────────────────────────────────────────────────────────

  const handleNameDoubleClick = useCallback(() => {
    setDraftName(group.name);
    setEditing(true);
  }, [group.name]);

  const commitRename = useCallback(() => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== group.name) {
      onRename(group.id, trimmed);
    } else {
      setDraftName(group.name);
    }
  }, [draftName, group.id, group.name, onRename]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") commitRename();
      if (e.key === "Escape") {
        setEditing(false);
        setDraftName(group.name);
      }
    },
    [commitRename, group.name]
  );

  // ── Header drag (move pile) ───────────────────────────────────────────────

  const handleHeaderPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (editing) return; // let the input handle its own events
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      // Compute canvas-relative start position using getBoundingClientRect() +
      // scrollLeft/scrollTop, consistent with toCanvasPoint() in Canvas.tsx.
      let startPointer: Point;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        startPointer = {
          x: e.clientX - rect.left + canvasEl.scrollLeft,
          y: e.clientY - rect.top + canvasEl.scrollTop,
        };
      } else {
        // Fallback: raw client coords (correct when there is no scroll offset).
        startPointer = { x: e.clientX, y: e.clientY };
      }
      moveDragRef.current = {
        startPointer,
        startPos: { ...group.position },
      };
    },
    [editing, group.position, canvasEl]
  );

  const handleHeaderPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = moveDragRef.current;
      if (!s) return;
      // Compute canvas-relative current pointer position.
      let currentPointer: Point;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        currentPointer = {
          x: e.clientX - rect.left + canvasEl.scrollLeft,
          y: e.clientY - rect.top + canvasEl.scrollTop,
        };
      } else {
        currentPointer = { x: e.clientX, y: e.clientY };
      }
      const dx = currentPointer.x - s.startPointer.x;
      const dy = currentPointer.y - s.startPointer.y;
      onMove(group.id, { x: s.startPos.x + dx, y: s.startPos.y + dy });
    },
    [group.id, onMove, canvasEl]
  );

  const handleHeaderPointerUp = useCallback(() => {
    moveDragRef.current = null;
  }, []);

  // ── Resize handle ─────────────────────────────────────────────────────────

  const handleResizePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture(e.pointerId);
      resizeDragRef.current = {
        startPointer: { x: e.clientX, y: e.clientY },
        startSize: { ...group.size },
      };
    },
    [group.size]
  );

  const handleResizePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = resizeDragRef.current;
      if (!s) return;
      const dx = e.clientX - s.startPointer.x;
      const dy = e.clientY - s.startPointer.y;
      onResize(group.id, {
        width: Math.max(MIN_WIDTH, s.startSize.width + dx),
        height: Math.max(MIN_HEIGHT, s.startSize.height + dy),
      });
    },
    [group.id, onResize]
  );

  const handleResizePointerUp = useCallback(() => {
    resizeDragRef.current = null;
  }, []);

  // ── Body click stop-propagation ───────────────────────────────────────────

  const handleBodyPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    // Prevent clicks on the pile body from propagating to the canvas
    // (which would deselect everything via canvas handleCanvasPointerDown).
    e.stopPropagation();
  }, []);

  // ── Stable button handlers ────────────────────────────────────────────────

  const handleCollapseClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCollapse(group.id, !group.collapsed);
    },
    [group.id, group.collapsed, onCollapse]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(group.id);
    },
    [group.id, onDelete]
  );

  // ── Styles ────────────────────────────────────────────────────────────────

  const displayHeight = group.collapsed ? COLLAPSED_HEIGHT : group.size.height;

  const containerStyle: CSSProperties = {
    position: "absolute",
    left: group.position.x,
    top: group.position.y,
    width: group.size.width,
    height: displayHeight,
    zIndex,
    userSelect: "none",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={`pile-card${group.collapsed ? " pile-card--collapsed" : ""}`}
      style={containerStyle}
      onPointerDown={handleBodyPointerDown}
    >
      {/* Header */}
      <div
        className="pile-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
      >
        {editing ? (
          <input
            className="pile-name pile-name--editing"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className="pile-name"
            onDoubleClick={handleNameDoubleClick}
            title={group.name}
          >
            {group.name}
          </span>
        )}

        <span className="pile-count" aria-label={`${members.length} items`}>
          {members.length}
        </span>

        <button
          className="pile-btn pile-btn--collapse"
          aria-label={group.collapsed ? "Expand pile" : "Collapse pile"}
          onClick={handleCollapseClick}
        >
          {group.collapsed ? "▶" : "▼"}
        </button>

        <button
          className="pile-btn pile-btn--delete"
          aria-label="Delete pile (items stay on canvas)"
          onClick={handleDeleteClick}
        >
          ✕
        </button>
      </div>

      {/* Body — hidden when collapsed */}
      {!group.collapsed && (
        <div className="pile-body">
          {members.map((item, index) => {
            const col = index % PILE_GRID_COLS;
            const row = Math.floor(index / PILE_GRID_COLS);
            const pos: Point = {
              x: col * PILE_GRID_CELL_W + 4,
              y: row * PILE_GRID_CELL_H + 4,
            };
            return (
              <CanvasItem
                key={item.id}
                item={item}
                position={pos}
                zIndex={1}
                selected={false}
                onPointerDown={onItemPointerDown}
              />
            );
          })}
        </div>
      )}

      {/* Resize handle (only when expanded) */}
      {!group.collapsed && (
        <div
          className="pile-resize"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          aria-hidden="true"
        />
      )}
    </div>
  );
});
