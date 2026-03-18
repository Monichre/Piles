import { useMemo } from "react";
import { useStore } from "zustand";

import { getStore } from "./store";

// ---------------------------------------------------------------------------
// WorkspaceShell
//
// Owns the top-level render decision: idle → loading → error → loaded/empty.
// FileMeta (items) and ItemLayout (workspace.itemLayouts) are accessed
// separately here to enforce the split model at the view boundary.
// ---------------------------------------------------------------------------

export function WorkspaceShell() {
  // getStore() returns the same singleton on every call; useMemo here is a
  // belt-and-suspenders guard so the store reference is stable across renders.
  const store = useMemo(() => getStore(), []);

  const status = useStore(store, (s) => s.status);
  const error = useStore(store, (s) => s.error);
  const folderPath = useStore(store, (s) => s.folderPath);
  // Accessed separately — never merged with ItemLayout.
  const items = useStore(store, (s) => s.items);
  const itemLayouts = useStore(store, (s) => s.workspace?.itemLayouts ?? null);
  const openFolder = useStore(store, (s) => s.openFolder);

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (status === "idle") {
    return (
      <main className="ws-shell ws-shell--idle">
        <div className="ws-prompt">
          <p className="eyebrow">Piles</p>
          <h1>Drop a folder to begin.</h1>
          <p className="lede">
            Piles arranges your files on a spatial canvas without touching the
            filesystem.
          </p>
          <button className="ws-btn ws-btn--primary" onClick={openFolder}>
            Open folder…
          </button>
        </div>
      </main>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main className="ws-shell ws-shell--loading" aria-busy="true">
        <p className="ws-status-label">
          Loading{folderPath ? ` "${folderPath}"` : ""}…
        </p>
      </main>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <main className="ws-shell ws-shell--error" role="alert">
        <div className="ws-prompt">
          <p className="eyebrow ws-eyebrow--error">Error</p>
          <h1>Could not load folder.</h1>
          {error && <p className="lede">{error}</p>}
          <button className="ws-btn ws-btn--primary" onClick={openFolder}>
            Try another folder…
          </button>
        </div>
      </main>
    );
  }

  // ── Loaded — empty folder ─────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <main className="ws-shell ws-shell--empty">
        <div className="ws-prompt">
          <p className="eyebrow">Empty folder</p>
          <h1>Nothing here yet.</h1>
          <p className="lede">
            Add files to <code>{folderPath}</code> and they will appear on the
            canvas.
          </p>
          <button className="ws-btn" onClick={openFolder}>
            Open a different folder…
          </button>
        </div>
      </main>
    );
  }

  // ── Loaded — canvas placeholder ───────────────────────────────────────────
  // itemLayouts accessed separately from items (split model enforcement).
  const layoutCount = itemLayouts ? Object.keys(itemLayouts).length : 0;

  return (
    <main className="ws-shell ws-shell--canvas">
      <header className="ws-toolbar">
        <span className="ws-folder-path" title={folderPath ?? ""}>
          {folderPath}
        </span>
        <span className="ws-item-count" aria-label={`${items.length} items`}>
          {items.length} {items.length === 1 ? "item" : "items"}
          {layoutCount > 0 && ` · ${layoutCount} positioned`}
        </span>
        <button className="ws-btn" onClick={openFolder}>
          Change folder
        </button>
      </header>

      {/* Canvas placeholder — Wave 3 will render real item tiles here. */}
      <div className="ws-canvas" aria-label="Workspace canvas">
        <ul className="ws-item-list" aria-label="File list">
          {items.map((item) => {
            // ItemLayout accessed separately — only by id lookup, never merged.
            const layout = itemLayouts?.[item.id] ?? null;
            return (
              <li
                key={item.id}
                className={`ws-item ws-item--${item.kind}`}
                data-has-layout={layout !== null}
              >
                <span className="ws-item-name">{item.name}</span>
                {item.extension && (
                  <span className="ws-item-ext">.{item.extension}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
