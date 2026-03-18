import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";

import type { FileMeta, Point } from "../shared/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CanvasItemProps {
  item: FileMeta;
  position: Point;
  zIndex: number;
  selected: boolean;
  onPointerDown: (e: PointerEvent<HTMLDivElement>, id: string) => void;
  onDoubleClick?: (id: string) => void;
  onReveal?: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onTrash?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_WIDTH = 96;
const ITEM_HEIGHT = 80;

// ---------------------------------------------------------------------------
// Context menu component
// ---------------------------------------------------------------------------

interface CtxMenuProps {
  x: number;
  y: number;
  onOpen: () => void;
  onReveal: () => void;
  onRename: () => void;
  onTrash: () => void;
  onClose: () => void;
}

function CtxMenu({ x, y, onOpen, onReveal, onRename, onTrash, onClose }: CtxMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside.
  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture so this fires before any stopPropagation in children.
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [onClose]);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const style: CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 99999,
  };

  const handleOpen = useCallback((e: MouseEvent) => { e.stopPropagation(); onOpen(); onClose(); }, [onOpen, onClose]);
  const handleReveal = useCallback((e: MouseEvent) => { e.stopPropagation(); onReveal(); onClose(); }, [onReveal, onClose]);
  const handleRename = useCallback((e: MouseEvent) => { e.stopPropagation(); onRename(); onClose(); }, [onRename, onClose]);
  const handleTrash = useCallback((e: MouseEvent) => { e.stopPropagation(); onTrash(); onClose(); }, [onTrash, onClose]);

  return (
    <div className="ctx-menu" style={style} ref={ref} role="menu">
      <button className="ctx-menu-item" role="menuitem" onClick={handleOpen}>
        Open
      </button>
      <button className="ctx-menu-item" role="menuitem" onClick={handleReveal}>
        Reveal in Finder
      </button>
      <div className="ctx-menu-sep" role="separator" />
      <button className="ctx-menu-item" role="menuitem" onClick={handleRename}>
        Rename…
      </button>
      <div className="ctx-menu-sep" role="separator" />
      <button className="ctx-menu-item ctx-menu-item--danger" role="menuitem" onClick={handleTrash}>
        Move to Trash
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CanvasItem = memo(function CanvasItem({
  item,
  position,
  zIndex,
  selected,
  onPointerDown,
  onDoubleClick,
  onReveal,
  onRename,
  onTrash,
}: CanvasItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);

  // Sync draft name when item.name changes externally, but only when not editing.
  useEffect(() => {
    if (!editing) setDraftName(item.name);
  }, [item.name, editing]);

  const style: CSSProperties = {
    position: "absolute",
    left: position.x,
    top: position.y,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    zIndex,
    userSelect: "none",
  };

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerDown(e, item.id);
    },
    [onPointerDown, item.id]
  );

  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) onDoubleClick(item.id);
  }, [onDoubleClick, item.id]);

  // Right-click opens context menu.
  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ x: e.clientX, y: e.clientY });
    },
    []
  );

  // ── Inline rename ─────────────────────────────────────────────────────────

  const renameInFlightRef = useRef(false);

  const startEditing = useCallback(() => {
    setDraftName(item.name);
    setEditing(true);
  }, [item.name]);

  const commitRename = useCallback(async () => {
    if (renameInFlightRef.current) return;
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === item.name) {
      setEditing(false);
      return;
    }
    renameInFlightRef.current = true;
    try {
      await onRename?.(item.id, trimmed);
    } finally {
      renameInFlightRef.current = false;
      setEditing(false);
    }
  }, [draftName, item.id, item.name, onRename]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void commitRename();
      }
      if (e.key === "Escape") {
        setEditing(false);
        setDraftName(item.name);
      }
    },
    [commitRename, item.name]
  );

  const handleInputBlur = useCallback(() => {
    void commitRename();
  }, [commitRename]);

  // Prevent pointer-down on the rename input from starting a drag.
  const handleInputPointerDown = useCallback((e: PointerEvent<HTMLInputElement>) => {
    e.stopPropagation();
  }, []);

  // ── Context menu actions ──────────────────────────────────────────────────

  const handleCtxOpen = useCallback(() => {
    if (onDoubleClick) onDoubleClick(item.id);
  }, [onDoubleClick, item.id]);

  const handleCtxReveal = useCallback(() => {
    if (onReveal) onReveal(item.id);
  }, [onReveal, item.id]);

  const handleCtxRename = startEditing;

  const handleCtxTrash = useCallback(() => {
    if (onTrash) onTrash(item.id);
  }, [onTrash, item.id]);

  const handleCtxClose = useCallback(() => {
    setCtxMenu(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`ci${selected ? " ci--selected" : ""}${item.kind === "folder" ? " ci--folder" : " ci--file"}`}
        style={style}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        data-item-id={item.id}
        aria-label={item.name}
        role="button"
        tabIndex={0}
      >
        <span className="ci-icon" aria-hidden="true">
          {item.kind === "folder" ? "📁" : "📄"}
        </span>
        {editing ? (
          <input
            className="ci-name ci-name--editing"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleNameKeyDown}
            onPointerDown={handleInputPointerDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="ci-name" title={item.name}>
            {item.name}
          </span>
        )}
      </div>

      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onOpen={handleCtxOpen}
          onReveal={handleCtxReveal}
          onRename={handleCtxRename}
          onTrash={handleCtxTrash}
          onClose={handleCtxClose}
        />
      )}
    </>
  );
});
