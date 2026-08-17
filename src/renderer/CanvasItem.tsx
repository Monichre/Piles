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
import {
  Archive,
  Code2,
  ExternalLink,
  FileText,
  Film,
  Folder,
  FolderOpen,
  ImageIcon,
  Music,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";

import type { FileMeta, Point } from "../shared/types";
import {
  getItemBadgeLabel,
  getItemKindLabel,
  getItemTone,
  getItemVisualKind,
  type ItemVisualKind,
} from "./presentation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CanvasItemProps {
  item: FileMeta;
  position: Point;
  /**
   * z-index for the card. A number for resting cards (base + saved relative
   * order), or a CSS var string for dragged cards (var(--z-drag)).
   */
  zIndex: number | string;
  selected: boolean;
  renameRequestToken?: number;
  /** True while this card is being dragged. Drives the .ci--dragging state. */
  dragging?: boolean;
  /** True when a filter pill is active and this card's category is excluded. */
  dimmed?: boolean;
  onPointerDown: (e: PointerEvent<HTMLDivElement>, id: string) => void;
  onDoubleClick?: (id: string) => void;
  onReveal?: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
  onTrash?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ITEM_WIDTH = 128;
// Tall enough for a visual area (80px) plus a two-line filename and kind
// label. Each file type renders a different visual in the top portion.
export const ITEM_HEIGHT = 148;

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

function CtxMenu({
  x,
  y,
  onOpen,
  onReveal,
  onRename,
  onTrash,
  onClose,
}: CtxMenuProps) {
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

  // Arrow-key traversal. role="menu" promises this to assistive tech, so the
  // handler has to actually provide it — Tab alone is not the menu pattern.
  const handleMenuKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    const items = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ??
        [],
    );
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "ArrowDown") next = (current + 1) % items.length;
    else next = (current - 1 + items.length) % items.length;

    items[next]?.focus();
  }, []);

  const style: CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: "var(--z-menu)",
  };

  const handleOpen = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onOpen();
      onClose();
    },
    [onOpen, onClose],
  );
  const handleReveal = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onReveal();
      onClose();
    },
    [onReveal, onClose],
  );
  const handleRename = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onRename();
      onClose();
    },
    [onRename, onClose],
  );
  const handleTrash = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onTrash();
      onClose();
    },
    [onTrash, onClose],
  );

  return (
    <div
      className="ctx-menu"
      style={style}
      ref={ref}
      role="menu"
      onKeyDown={handleMenuKeyDown}
    >
      <button className="ctx-menu-item" role="menuitem" onClick={handleOpen}>
        <ExternalLink size={15} strokeWidth={1.75} aria-hidden="true" />
        Open
      </button>
      <button className="ctx-menu-item" role="menuitem" onClick={handleReveal}>
        <FolderOpen size={15} strokeWidth={1.75} aria-hidden="true" />
        Reveal in Finder
      </button>
      <div className="ctx-menu-sep" role="separator" />
      <button className="ctx-menu-item" role="menuitem" onClick={handleRename}>
        <Pencil size={15} strokeWidth={1.75} aria-hidden="true" />
        Rename…
      </button>
      <div className="ctx-menu-sep" role="separator" />
      <button
        className="ctx-menu-item ctx-menu-item--danger"
        role="menuitem"
        onClick={handleTrash}
      >
        <Trash2 size={15} strokeWidth={1.75} aria-hidden="true" />
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
  dragging = false,
  dimmed = false,
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
  const tone = getItemTone(item);
  const visualKind = getItemVisualKind(item);

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerDown(e, item.id);
    },
    [onPointerDown, item.id],
  );

  const handleDoubleClick = useCallback(() => {
    if (onDoubleClick) onDoubleClick(item.id);
  }, [onDoubleClick, item.id]);

  // Right-click opens context menu.
  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

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
    [commitRename, item.name],
  );

  const handleInputBlur = useCallback(() => {
    void commitRename();
  }, [commitRename]);

  // Prevent pointer-down on the rename input from starting a drag.
  const handleInputPointerDown = useCallback(
    (e: PointerEvent<HTMLInputElement>) => {
      e.stopPropagation();
    },
    [],
  );

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
    [editing, handleDoubleClick, openContextMenuFromKeyboard],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const classNames = [
    "ci",
    `ci--kind-${visualKind}`,
    `ci--tone-${tone}`,
    selected ? "ci--selected" : "",
    dragging ? "ci--dragging" : "",
    dimmed ? "ci--dimmed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={classNames}
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
        <div className="ci-visual" aria-hidden="true">
          <VisualKind kind={visualKind} badge={badgeLabel} />
        </div>
        <div className="ci-info">
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

// ---------------------------------------------------------------------------
// VisualKind — renders the visual area for each file type
// ---------------------------------------------------------------------------

interface VisualKindProps {
  kind: ItemVisualKind;
  badge: string;
}

function VisualKind({ kind, badge }: VisualKindProps) {
  switch (kind) {
    case "folder":
      return (
        <div className="ci-visual-folder">
          <Folder size={36} strokeWidth={1.5} />
        </div>
      );
    case "image":
      return (
        <div className="ci-visual-image">
          <ImageIcon size={28} strokeWidth={1.5} />
          <span className="ci-ext">{badge}</span>
        </div>
      );
    case "video":
      return (
        <div className="ci-visual-video">
          <div className="ci-play-circle">
            <Play size={20} strokeWidth={2} fill="currentColor" />
          </div>
          <span className="ci-ext">{badge}</span>
        </div>
      );
    case "audio":
      return (
        <div className="ci-visual-audio">
          <Music size={28} strokeWidth={1.5} />
          <div className="ci-waveform" />
          <span className="ci-ext">{badge}</span>
        </div>
      );
    case "document":
      return (
        <div className="ci-visual-document">
          <FileText size={32} strokeWidth={1.5} />
          <span className="ci-ext">{badge}</span>
        </div>
      );
    case "code":
      return (
        <div className="ci-visual-code">
          <Code2 size={28} strokeWidth={1.5} />
          <span className="ci-ext">{badge}</span>
        </div>
      );
    case "archive":
      return (
        <div className="ci-visual-archive">
          <Archive size={30} strokeWidth={1.5} />
          <span className="ci-ext">{badge}</span>
        </div>
      );
    default:
      return (
        <div className="ci-visual-other">
          <span className="ci-ext">{badge}</span>
        </div>
      );
  }
}
