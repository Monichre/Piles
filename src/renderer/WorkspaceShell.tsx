import { useCallback, useEffect, useMemo } from "react";
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
  const groupCount = useStore(
    store,
    (s) => Object.keys(s.workspace?.groups ?? {}).length
  );
  const openFolder = useStore(store, (s) => s.openFolder);
  const createGroup = useStore(store, (s) => s.createGroup);
  const saveWorkspace = useStore(store, (s) => s.saveWorkspace);
  const autoGroup = useStore(store, (s) => s.autoGroup);
  const startWatching = useStore(store, (s) => s.startWatching);
  const stopWatching = useStore(store, (s) => s.stopWatching);
  const rescanFolder = useStore(store, (s) => s.rescanFolder);

  // ── Watch folder for external changes ───────────────────────────────────────
  // Set up folder watching when loaded, clean up on unmount
  useEffect(() => {
    if (status === "loaded" && folderPath) {
      // Start watching the folder
      void startWatching();

      // Subscribe to folder change events from main process
      const unsubscribe = window.piles.onFolderChanged(() => {
        // Debounce: re-scan and reconcile on next tick
        Promise.resolve().then(() => {
          void rescanFolder();
        });
      });

      // Clean up on unmount or when status changes
      return () => {
        unsubscribe();
        void stopWatching();
      };
    }
  }, [status, folderPath, startWatching, stopWatching, rescanFolder]);

  // ── Pile creation handler ──────────────────────────────────────────────────

  const handleNewPile = useCallback(() => {
    // Place new empty pile in a visible default position.
    createGroup("Pile", [], { x: 40, y: 40 });
    void saveWorkspace();
  }, [createGroup, saveWorkspace]);

  // ── Idle ──────────────────────────────────────────────────────────────────
  if (status === "idle") {
    return (
      <main className="ws-shell ws-shell--idle">
        <div className="ws-prompt">
          <div className="ws-prompt-card">
            <p className="eyebrow">Piles</p>
            <h1>Turn a folder into a working board.</h1>
            <p className="lede">
              Lay files out like references on a studio wall, then stack them
              into virtual piles without touching the filesystem.
            </p>
            <div className="ws-prompt-actions">
              <button className="ws-btn ws-btn--primary" onClick={openFolder}>
                Open folder…
              </button>
            </div>
            <div className="ws-prompt-notes" aria-hidden="true">
              <span className="ws-note-pill">Per-folder layout memory</span>
              <span className="ws-note-pill">Virtual grouping only</span>
            </div>
          </div>
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
          <div className="ws-prompt-card">
            <p className="eyebrow ws-eyebrow--error">Error</p>
            <h1>Could not load that workspace.</h1>
            {error && <p className="lede">{error}</p>}
            <div className="ws-prompt-actions">
              <button className="ws-btn ws-btn--primary" onClick={openFolder}>
                Try another folder…
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Loaded — empty folder ─────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <main className="ws-shell ws-shell--empty">
        <div className="ws-prompt">
          <div className="ws-prompt-card">
            <p className="eyebrow">Empty folder</p>
            <h1>Nothing is pinned to the board yet.</h1>
            <p className="lede">
              Add files to <code>{folderPath}</code> and they will appear here
              as movable cards.
            </p>
            <div className="ws-prompt-actions">
              <button className="ws-btn" onClick={openFolder}>
                Open a different folder…
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Loaded — canvas ───────────────────────────────────────────────────────

  return (
    <main className="ws-shell ws-shell--canvas">
      <header className="ws-toolbar">
        <div className="ws-toolbar__brand">
          <div className="ws-brand-mark" aria-hidden="true">
            PL
          </div>
          <div className="ws-brand-copy">
            <p className="ws-brand-kicker">Studio board</p>
            <strong>Piles</strong>
          </div>
        </div>

        <div className="ws-toolbar__folder-block">
          <span className="ws-toolbar__label">Active folder</span>
          <span className="ws-folder-path" title={folderPath ?? ""}>
            {folderPath}
          </span>
        </div>

        <div className="ws-toolbar__meta">
          <span className="ws-pill" aria-label={`${items.length} items`}>
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
          <span className="ws-pill ws-pill--warm" aria-label={`${groupCount} piles`}>
            {groupCount} {groupCount === 1 ? "pile" : "piles"}
          </span>
        </div>

        <div className="ws-toolbar__actions">
          <button
            className="ws-btn ws-btn--primary"
            onClick={() => autoGroup()}
            title="Automatically group files by type"
          >
            Auto Group
          </button>
          <button
            className="ws-btn"
            onClick={handleNewPile}
            title="Create an empty pile"
          >
            New pile
          </button>
          <button className="ws-btn" onClick={openFolder}>
            Change folder
          </button>
        </div>
      </header>

      <section className="ws-stage">
        <Canvas />
      </section>
    </main>
  );
}
