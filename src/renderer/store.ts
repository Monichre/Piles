import { createStore as createZustandStore } from "zustand";

import type { PilesAPI } from "../shared/ipc";
import type { FileMeta, ItemLayout, WorkspaceData } from "../shared/types";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export type LoadStatus = "idle" | "loading" | "loaded" | "error";

export interface PilesState {
  // Split model — FileMeta (live FS) and WorkspaceData.itemLayouts (persisted
  // layout) are intentionally separate and must never be merged into one record.
  folderPath: string | null;
  items: FileMeta[];
  workspace: WorkspaceData | null;
  status: LoadStatus;
  error: string | null;
}

export interface PilesActions {
  /** Open a system folder-picker dialog then load the chosen folder. */
  openFolder: () => Promise<void>;
  /** Load items and workspace for an already-known folder path. */
  loadFolder: (path: string) => Promise<void>;
  /** Persist the current workspace through the preload bridge. */
  saveWorkspace: () => Promise<void>;
  /** Update a single item layout, creating it if it doesn't exist. */
  updateItemLayout: (id: string, patch: Partial<ItemLayout>) => void;
  /** Batch-update multiple item layouts, creating missing entries. */
  updateItemLayouts: (updates: Record<string, Partial<ItemLayout>>) => void;
}

export type PilesStore = PilesState & PilesActions;

// ---------------------------------------------------------------------------
// Factory — accepts an injected API so the store is fully testable without
// a real Electron environment.
// ---------------------------------------------------------------------------

export function createStore(api: PilesAPI) {
  // Per-instance counter so concurrent loadFolder calls can detect staleness.
  // Incrementing before the async work and comparing after ensures only the
  // most-recently-dispatched call commits its result to state.
  let loadRequestId = 0;

  return createZustandStore<PilesStore>((set, get) => ({
    // Initial state
    folderPath: null,
    items: [],
    workspace: null,
    status: "idle",
    error: null,

    // Actions
    openFolder: async () => {
      const chosen = await api.selectFolder();
      if (chosen === null) {
        // User cancelled — leave existing state untouched.
        return;
      }
      await get().loadFolder(chosen);
    },

    loadFolder: async (path: string) => {
      const requestId = ++loadRequestId;
      set({ status: "loading", error: null, folderPath: path });

      try {
        // Run both fetches in parallel — they are independent.
        const [items, rawWorkspace] = await Promise.all([
          api.getFolderItems(path),
          api.loadWorkspace(path),
        ]);

        // Discard result if a newer loadFolder call was made while we awaited.
        if (requestId !== loadRequestId) return;

        // If no workspace exists yet, seed a minimal one so the canvas always
        // has a valid base to work with.
        const workspace: WorkspaceData = rawWorkspace ?? {
          folderPath: path,
          groups: {},
          itemLayouts: {},
          settings: { snapToGrid: false },
        };

        set({ items, workspace, status: "loaded" });
      } catch (err) {
        if (requestId !== loadRequestId) return;
        const message =
          err instanceof Error ? err.message : "Failed to load folder.";
        set({ status: "error", error: message, items: [], workspace: null });
      }
    },

    saveWorkspace: async () => {
      const { workspace } = get();
      if (workspace === null) return;
      await api.saveWorkspace(workspace);
    },

    updateItemLayout: (id, patch) => {
      const { workspace } = get();
      if (!workspace) return;
      const existing: ItemLayout = workspace.itemLayouts[id] ?? {
        id,
        position: { x: 0, y: 0 },
        groupId: null,
        zIndex: 0,
      };
      set({
        workspace: {
          ...workspace,
          itemLayouts: {
            ...workspace.itemLayouts,
            [id]: { ...existing, ...patch },
          },
        },
      });
    },

    updateItemLayouts: (updates) => {
      const { workspace } = get();
      if (!workspace) return;
      const next = { ...workspace.itemLayouts };
      for (const [id, patch] of Object.entries(updates)) {
        next[id] = {
          ...(next[id] ?? { id, position: { x: 0, y: 0 }, groupId: null, zIndex: 0 }),
          ...patch,
        };
      }
      set({ workspace: { ...workspace, itemLayouts: next } });
    },
  }));
}

// ---------------------------------------------------------------------------
// Singleton store for the renderer — backed by window.piles.
// Lazily initialised so the module can be imported in Node (test environment)
// without throwing "window is not defined". Tests use createStore() directly
// with a mock API and never access this export.
// ---------------------------------------------------------------------------

let _store: ReturnType<typeof createStore> | undefined;

export function getStore(): ReturnType<typeof createStore> {
  if (_store === undefined) {
    _store = createStore(window.piles);
  }
  return _store;
}
