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
import { getItemBadgeLabel, getItemKindLabel } from "./presentation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CanvasItemProps {
  item: FileMeta;
  position: Point;
  zIndex: number;
  selected: boolean;
  renameRequestToken?: number;
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

  // Keyboard-opened menus should move focus into the menu immediately.
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
  }, []);

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
  renameRequestToken,
  onPointerDown,
  onDoubleClick,
  onReveal,
  onRename,
  onTrash,
}: CanvasItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

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

  const badgeLabel = getItemBadgeLabel(item);
  const kindLabel = getItemKindLabel(item);

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

  useEffect(() => {
    if (renameRequestToken !== undefined) {
      startEditing();
    }
  }, [renameRequestToken, startEditing]);

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

    // Restore focus to the card after the menu unmounts. Inline rename keeps
    // focus because its input is rendered inside the card and receives
    // autoFocus before this callback runs.
    requestAnimationFrame(() => {
      if (!itemRef.current?.contains(document.activeElement)) {
        itemRef.current?.focus();
      }
    });
  }, []);

  const openContextMenuFromKeyboard = useCallback(() => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setCtxMenu({
      x: rect.right - 12,
      y: rect.top + 12,
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (editing) {
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleDoubleClick();
        return;
      }

      if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
        e.preventDefault();
        openContextMenuFromKeyboard();
      }
    },
    [editing, handleDoubleClick, openContextMenuFromKeyboard]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className={`ci${selected ? " ci--selected" : ""}${item.kind === "folder" ? " ci--folder" : " ci--file"}`}
        ref={itemRef}
        style={style}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        data-item-id={item.id}
        aria-label={item.name}
        aria-pressed={selected}
        role="button"
        tabIndex={0}
      >
        {item.kind === "folder" ? (
          <div className="ci-folder-chrome" aria-hidden="true">
            <div className="ci-folder-tab">
              <span className="ci-badge">{badgeLabel}</span>
            </div>
            <div className="ci-folder-body">
              <span className="ci-folder-papers" />
            </div>
          </div>
        ) : (
          <>
            <div className="ci-topline" aria-hidden="true">
              <span className="ci-badge">{badgeLabel}</span>
              <span className="ci-topline__rule" />
            </div>
            <div className="ci-preview ci-preview--file" aria-hidden="true">
              <span className="ci-preview__line" />
              <span className="ci-preview__line ci-preview__line--short" />
            </div>
          </>
        )}
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
        <span className="ci-meta">{kindLabel}</span>
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
