import { useCallback, useMemo } from "react";
import { useStore } from "zustand";

import { Canvas } from "./Canvas";
import { getStore } from "./store";

// ---------------------------------------------------------------------------
// WorkspaceShell
//
// Owns the top-level render decision: idle → loading → error → loaded/empty.
// FileMeta (items) and ItemLayout (workspace.itemLayouts) are accessed
// separately here to enforce the split model at the view boundary.
// ---------------------------------------------------------------------------

export function WorkspaceShell() {
  // useMemo ensures a stable store reference across re-renders and React StrictMode double-invokes
  const store = useMemo(() => getStore(), []);

  const status = useStore(store, (s) => s.status);
  const error = useStore(store, (s) => s.error);
  const folderPath = useStore(store, (s) => s.folderPath);
  // Accessed separately — never merged with ItemLayout.
  const items = useStore(store, (s) => s.items);
  const openFolder = useStore(store, (s) => s.openFolder);
  const createGroup = useStore(store, (s) => s.createGroup);
  const saveWorkspace = useStore(store, (s) => s.saveWorkspace);

  // ── Pile creation handler ──────────────────────────────────────────────────

  const handleNewPile = useCallback(() => {
    // Place new empty pile in a visible default position.
    createGroup("Pile", [], { x: 40, y: 40 });
    void saveWorkspace();
  }, [createGroup, saveWorkspace]);

  // TODO: A "Group selection" button that seeds the pile with selected items
  // requires access to selection state, which lives in Canvas. Either lift
  // selection into the store or add a toolbar overlay inside Canvas.tsx once
  // that is needed.

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

  // ── Loaded — canvas ───────────────────────────────────────────────────────

  return (
    <main className="ws-shell ws-shell--canvas">
      <header className="ws-toolbar">
        <span className="ws-folder-path" title={folderPath ?? ""}>
          {folderPath}
        </span>
        <span className="ws-item-count" aria-label={`${items.length} items`}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
        <button className="ws-btn" onClick={handleNewPile} title="Create an empty pile">
          New pile
        </button>
        <button className="ws-btn" onClick={openFolder}>
          Change folder
        </button>
      </header>

      <Canvas />
    </main>
  );
}
