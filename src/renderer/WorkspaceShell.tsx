import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { FolderOpen, Layers, Plus, WandSparkles } from "lucide-react";

import { Canvas } from "./Canvas";
import { getStore } from "./store";
import { getItemTone, type ItemTone } from "./presentation";

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
    (s) => Object.keys(s.workspace?.groups ?? {}).length,
  );
  const openFolder = useStore(store, (s) => s.openFolder);
  const createGroup = useStore(store, (s) => s.createGroup);
  const saveWorkspace = useStore(store, (s) => s.saveWorkspace);
  const autoGroup = useStore(store, (s) => s.autoGroup);
  const startWatching = useStore(store, (s) => s.startWatching);
  const stopWatching = useStore(store, (s) => s.stopWatching);
  const rescanFolder = useStore(store, (s) => s.rescanFolder);

  // ── Filter pills ───────────────────────────────────────────────────────────
  // Ephemeral UI state — never persisted, never touches the store or the
  // filesystem. A null filterTone means "show everything".
  const [filterTone, setFilterTone] = useState<ItemTone | null>(null);

  const toneCounts = useMemo(() => {
    const counts: Record<ItemTone, number> = {
      green: 0,
      yellow: 0,
      red: 0,
      plain: 0,
    };
    for (const item of items) {
      counts[getItemTone(item)] += 1;
    }
    return counts;
  }, [items]);

  // Reset the filter whenever the folder changes so a stale filter never
  // carries into a new workspace.
  useEffect(() => {
    setFilterTone(null);
  }, [folderPath]);

  const FILTER_LABELS: Record<ItemTone, string> = {
    green: "Documents",
    yellow: "Media",
    red: "Code",
    plain: "Other",
  };
  const FILTER_TONES: ItemTone[] = ["green", "yellow", "red", "plain"];

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
    createGroup("Pile", [], { x: 180, y: 120 });
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
                <FolderOpen size={15} strokeWidth={2} aria-hidden="true" />
                Open folder…
              </button>
            </div>
            <div className="ws-prompt-notes">
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
          Loading{folderPath ? ` “${folderPath}”` : ""}…
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
                <FolderOpen size={15} strokeWidth={2} aria-hidden="true" />
                Open folder…
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
                <FolderOpen size={15} strokeWidth={2} aria-hidden="true" />
                Open folder…
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
            <Layers size={16} strokeWidth={2} />
          </div>
          <div className="ws-brand-copy">
            <strong>Piles</strong>
          </div>
        </div>

        {/* The path is its own label — monospace already says "this is a path",
            so the "Active folder" eyebrow above it was saying nothing twice. */}
        <div className="ws-toolbar__folder-block">
          <span className="ws-folder-path" title={folderPath ?? ""}>
            {folderPath}
          </span>
        </div>

        <div className="ws-toolbar__meta">
          <span className="ws-pill">
            <strong>{items.length}</strong>{" "}
            {items.length === 1 ? "item" : "items"}
          </span>
          <span className="ws-pill">
            <strong>{groupCount}</strong> {groupCount === 1 ? "pile" : "piles"}
          </span>
        </div>

        <div className="ws-toolbar__actions">
          <button
            className="ws-btn ws-btn--primary"
            onClick={() => autoGroup()}
            disabled={items.length === 0}
          >
            <WandSparkles size={15} strokeWidth={2} aria-hidden="true" />
            Auto group
          </button>
          <button className="ws-btn" onClick={handleNewPile}>
            <Plus size={15} strokeWidth={2} aria-hidden="true" />
            New pile
          </button>
          <button className="ws-btn ws-btn--quiet" onClick={openFolder}>
            <FolderOpen size={15} strokeWidth={2} aria-hidden="true" />
            Change folder
          </button>
        </div>
      </header>

      {items.length > 0 && (
        <div className="ws-filters" role="group" aria-label="Filter by category">
          <button
            type="button"
            className="ws-filter"
            aria-pressed={filterTone === null}
            onClick={() => setFilterTone(null)}
          >
            All
            <span className="ws-filter__count">{items.length}</span>
          </button>
          {FILTER_TONES.filter((tone) => toneCounts[tone] > 0).map((tone) => (
            <button
              key={tone}
              type="button"
              className="ws-filter"
              aria-pressed={filterTone === tone}
              onClick={() => setFilterTone(tone)}
            >
              {FILTER_LABELS[tone]}
              <span className="ws-filter__count">{toneCounts[tone]}</span>
            </button>
          ))}
        </div>
      )}

      <section className="ws-stage">
        <Canvas filterTone={filterTone} />
      </section>
    </main>
  );
}
