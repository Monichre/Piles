import { createStore as createZustandStore } from "zustand";

import type { PilesAPI } from "../shared/ipc";
import type { FileMeta, GroupModel, ItemLayout, Point, WorkspaceData } from "../shared/types";

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

  // ── File actions ──────────────────────────────────────────────────────────
  /** Open the file or folder in the default application / Finder. */
  openItem: (id: string) => Promise<void>;
  /** Reveal the item in Finder without opening it. */
  revealItem: (id: string) => Promise<void>;
  /**
   * Rename the file on disk and update all in-memory state atomically.
   * Path-based identity: id, path, and name all change; ItemLayout key moves
   * to the new path; GroupModel.itemIds are updated; workspace is saved.
   */
  renameItem: (id: string, newName: string) => Promise<void>;
  /**
   * Move the file to Trash, remove it from items, itemLayouts, and any
   * GroupModel.itemIds, and persist the workspace.
   */
  trashItem: (id: string) => Promise<void>;

  // ── Pile (Group) actions ─────────────────────────────────────────────────
  /**
   * Create a new group with the given name, initial member item IDs, and
   * canvas position. Returns the new group's id.
   * Item layouts for the given IDs are updated to set groupId.
   */
  createGroup: (name: string, itemIds: string[], position: Point) => string;
  /**
   * Remove a group from the workspace. NEVER deletes files on disk — purely
   * removes the visual grouping. Items that belonged to the group have their
   * groupId set back to null.
   */
  deleteGroup: (groupId: string) => void;
  /** Patch one or more fields of an existing group (name, position, size, collapsed). */
  updateGroup: (groupId: string, patch: Partial<GroupModel>) => void;
  /** Move an item into a group, removing it from its current group first. */
  addItemToGroup: (itemId: string, groupId: string) => void;
  /** Remove an item from its current group (sets ItemLayout.groupId to null). */
  removeItemFromGroup: (itemId: string) => void;

  // ── Watch/Sync actions ─────────────────────────────────────────────────
  /** Start watching the current folder for external changes. */
  startWatching: () => Promise<void>;
  /** Stop watching the current folder. */
  stopWatching: () => Promise<void>;
  /**
   * Rescan folder and reconcile persisted layout with live filesystem state.
   * Called automatically when folder changes are detected, but can also be
   * triggered manually.
   */
  rescanFolder: () => Promise<void>;

  // ── Auto Group action ──────────────────────────────────────────────────
  /**
   * Group items into piles based on deterministic file type rules.
   * This does NOT move files on disk — purely creates visual groupings.
   * Grouping rules:
   *   - Images (jpg, jpeg, png, gif, webp, svg, bmp, heic) -> "Images"
   *   - Documents (pdf, doc, docx, txt, rtf, xls, xlsx, ppt, pptx) -> "Documents"
   *   - Installers (dmg, pkg, app) -> "Installers"
   *   - Archives (zip, rar, 7z, tar, gz) -> "Archives"
   *   - Everything else (including folders) -> "Misc"
   */
  autoGroup: () => Promise<void>;
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

    // ── File actions ───────────────────────────────────────────────────────

    openItem: async (id) => {
      const { items } = get();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await api.openFile(item.path);
    },

    revealItem: async (id) => {
      const { items } = get();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      await api.revealInFinder(item.path);
    },

    renameItem: async (id, newName) => {
      const { items, workspace } = get();
      const item = items.find((i) => i.id === id);
      if (!item || !workspace) return;

      const { newPath } = await api.renameFile(item.path, newName);

      // 1. Update FileMeta in items: replace id, path, name, and extension.
      const lastDot = newName.lastIndexOf(".");
      const newExtension = lastDot > 0 ? newName.slice(lastDot + 1) : null;
      const nextItems = items.map((i) =>
        i.id === id
          ? { ...i, id: newPath, path: newPath, name: newName, extension: newExtension }
          : i
      );

      // 2. Update itemLayouts: move entry from old id to newPath, update .id field.
      const oldLayout = workspace.itemLayouts[id];
      const nextLayouts = { ...workspace.itemLayouts };
      if (oldLayout) {
        delete nextLayouts[id];
        nextLayouts[newPath] = { ...oldLayout, id: newPath };
      }

      // 3. Update GroupModel.itemIds: replace old id with newPath in every group.
      const nextGroups: Record<string, GroupModel> = {};
      for (const [gid, group] of Object.entries(workspace.groups)) {
        nextGroups[gid] = {
          ...group,
          itemIds: group.itemIds.map((iid) => (iid === id ? newPath : iid)),
        };
      }

      set({
        items: nextItems,
        workspace: {
          ...workspace,
          itemLayouts: nextLayouts,
          groups: nextGroups,
        },
      });

      // 4. Persist.
      await get().saveWorkspace();
    },

    trashItem: async (id) => {
      const { items, workspace } = get();
      const item = items.find((i) => i.id === id);
      if (!item || !workspace) return;

      await api.trashFile(item.path);

      // 1. Remove from items.
      const nextItems = items.filter((i) => i.id !== id);

      // 2. Remove from itemLayouts.
      const nextLayouts = { ...workspace.itemLayouts };
      delete nextLayouts[id];

      // 3. Remove from GroupModel.itemIds in every group.
      const nextGroups: Record<string, GroupModel> = {};
      for (const [gid, group] of Object.entries(workspace.groups)) {
        nextGroups[gid] = {
          ...group,
          itemIds: group.itemIds.filter((iid) => iid !== id),
        };
      }

      set({
        items: nextItems,
        workspace: {
          ...workspace,
          itemLayouts: nextLayouts,
          groups: nextGroups,
        },
      });

      // 4. Persist.
      await get().saveWorkspace();
    },

    // ── Pile (Group) actions ───────────────────────────────────────────────

    createGroup: (name, itemIds, position) => {
      const { workspace } = get();
      if (!workspace) return "";

      const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const group: GroupModel = {
        id,
        name,
        position,
        size: { width: 240, height: 200 },
        collapsed: false,
        itemIds: [...itemIds],
      };

      // Remove seeded items from any group they currently belong to so that
      // each item can only be in one group at a time (Issue 6: without this,
      // the old group's itemIds array still referenced the item even though
      // itemLayouts[itemId].groupId pointed to the new group).
      const updatedGroups: Record<string, GroupModel> = { ...workspace.groups };
      for (const itemId of itemIds) {
        const oldGroupId = workspace.itemLayouts[itemId]?.groupId;
        if (oldGroupId && updatedGroups[oldGroupId]) {
          updatedGroups[oldGroupId] = {
            ...updatedGroups[oldGroupId],
            itemIds: updatedGroups[oldGroupId].itemIds.filter((i) => i !== itemId),
          };
        }
      }
      // Add the new group.
      updatedGroups[id] = group;

      // Update itemLayouts so each member item's groupId is set.
      const nextLayouts = { ...workspace.itemLayouts };
      for (const itemId of itemIds) {
        nextLayouts[itemId] = {
          ...(nextLayouts[itemId] ?? { id: itemId, position: { x: 0, y: 0 }, zIndex: 0 }),
          groupId: id,
        };
      }

      set({
        workspace: {
          ...workspace,
          groups: updatedGroups,
          itemLayouts: nextLayouts,
        },
      });

      return id;
    },

    deleteGroup: (groupId) => {
      const { workspace } = get();
      if (!workspace) return;

      const group = workspace.groups[groupId];
      if (!group) return;

      // Release all member items back to the canvas (set groupId → null).
      // This NEVER touches the filesystem — purely layout mutation.
      const nextLayouts = { ...workspace.itemLayouts };
      for (const itemId of group.itemIds) {
        if (nextLayouts[itemId]) {
          nextLayouts[itemId] = { ...nextLayouts[itemId], groupId: null };
        }
      }

      const nextGroups = { ...workspace.groups };
      delete nextGroups[groupId];

      set({
        workspace: {
          ...workspace,
          groups: nextGroups,
          itemLayouts: nextLayouts,
        },
      });
    },

    updateGroup: (groupId, patch) => {
      const { workspace } = get();
      if (!workspace) return;

      const existing = workspace.groups[groupId];
      if (!existing) return;

      set({
        workspace: {
          ...workspace,
          groups: {
            ...workspace.groups,
            [groupId]: { ...existing, ...patch },
          },
        },
      });
    },

    addItemToGroup: (itemId, groupId) => {
      const { workspace } = get();
      if (!workspace) return;

      const targetGroup = workspace.groups[groupId];
      if (!targetGroup) return;

      // Remove from any current group first.
      const currentGroupId = workspace.itemLayouts[itemId]?.groupId ?? null;
      let nextGroups = workspace.groups;

      if (currentGroupId && currentGroupId !== groupId) {
        const oldGroup = nextGroups[currentGroupId];
        if (oldGroup) {
          nextGroups = {
            ...nextGroups,
            [currentGroupId]: {
              ...oldGroup,
              itemIds: oldGroup.itemIds.filter((id) => id !== itemId),
            },
          };
        }
      }

      // Add to target group if not already a member.
      const alreadyMember = targetGroup.itemIds.includes(itemId);
      nextGroups = {
        ...nextGroups,
        [groupId]: {
          ...targetGroup,
          itemIds: alreadyMember ? targetGroup.itemIds : [...targetGroup.itemIds, itemId],
        },
      };

      // Update item layout groupId.
      const existing = workspace.itemLayouts[itemId];
      const nextLayouts = {
        ...workspace.itemLayouts,
        [itemId]: {
          ...(existing ?? { id: itemId, position: { x: 0, y: 0 }, zIndex: 0 }),
          groupId,
        },
      };

      set({
        workspace: {
          ...workspace,
          groups: nextGroups,
          itemLayouts: nextLayouts,
        },
      });
    },

    removeItemFromGroup: (itemId) => {
      const { workspace } = get();
      if (!workspace) return;

      const currentGroupId = workspace.itemLayouts[itemId]?.groupId ?? null;
      if (!currentGroupId) return; // not in any group

      const group = workspace.groups[currentGroupId];
      let nextGroups = workspace.groups;

      if (group) {
        nextGroups = {
          ...nextGroups,
          [currentGroupId]: {
            ...group,
            itemIds: group.itemIds.filter((id) => id !== itemId),
          },
        };
      }

      const existing = workspace.itemLayouts[itemId];
      const nextLayouts = {
        ...workspace.itemLayouts,
        [itemId]: {
          ...(existing ?? { id: itemId, position: { x: 0, y: 0 }, zIndex: 0 }),
          groupId: null,
        },
      };

      set({
        workspace: {
          ...workspace,
          groups: nextGroups,
          itemLayouts: nextLayouts,
        },
      });
    },

    // ── Watch/Sync actions ─────────────────────────────────────────────────

    startWatching: async () => {
      const { folderPath } = get();
      if (!folderPath) return;
      await api.watchFolder(folderPath);
    },

    stopWatching: async () => {
      await api.unwatchFolder();
    },

    rescanFolder: async () => {
      const { folderPath, workspace } = get();
      if (!folderPath || !workspace) return;

      // Fetch fresh file list
      const liveItems = await api.getFolderItems(folderPath);
      const liveIds = new Set(liveItems.map((item) => item.id));
      const persistedIds = new Set(Object.keys(workspace.itemLayouts));

      // Reconcile: build new items list and layouts
      // - New items: exist in live but not in persisted
      // - Surviving items: exist in both
      // - Removed items: exist in persisted but not in live (rename => old path removed)

      const nextItems = liveItems;
      const nextItemLayouts = { ...workspace.itemLayouts };
      const nextGroups = { ...workspace.groups };

      // Remove stale layout entries (files deleted or renamed externally)
      for (const persistedId of persistedIds) {
        if (!liveIds.has(persistedId)) {
          delete nextItemLayouts[persistedId];
        }
      }

      // Update groups to remove stale itemIds
      for (const [groupId, group] of Object.entries(nextGroups)) {
        nextGroups[groupId] = {
          ...group,
          itemIds: group.itemIds.filter((itemId) => liveIds.has(itemId)),
        };
      }

      set({
        items: nextItems,
        workspace: {
          ...workspace,
          itemLayouts: nextItemLayouts,
          groups: nextGroups,
        },
      });

      // Persist the reconciled state
      await get().saveWorkspace();
    },

    // ── Auto Group action ─────────────────────────────────────────────────

    autoGroup: async () => {
      const { items, workspace } = get();
      if (!workspace || items.length === 0) return;

      // Define grouping rules: extension -> group name
      // Note: extensions are case-insensitive, we'll normalize to lowercase
      const extensionGroups: Record<string, string[]> = {
        Images: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "heic", "tiff", "ico"],
        Documents: ["pdf", "doc", "docx", "txt", "rtf", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "pages", "numbers", "key"],
        Installers: ["dmg", "pkg", "app", "exe", "msi", "deb", "rpm"],
        Archives: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "iso"],
      };

      // Build a map: itemId -> group name
      const itemToGroupName: Record<string, string> = {};
      
      for (const item of items) {
        // Folders go to "Misc" (or we can skip them)
        if (item.isDirectory) {
          // Determine folder type or skip - for now, all folders go to Misc
          itemToGroupName[item.id] = "Misc";
          continue;
        }
        
        // Determine group by extension
        const ext = item.extension?.toLowerCase() ?? "";
        let groupName: string | null = null;
        
        // Check each category
        for (const [category, extensions] of Object.entries(extensionGroups)) {
          if (extensions.includes(ext)) {
            groupName = category;
            break;
          }
        }
        
        // Default to Misc if no match
        itemToGroupName[item.id] = groupName ?? "Misc";
      }

      // Collect items by group name for pile positioning
      const groupItems: Record<string, string[]> = {};
      for (const [itemId, groupName] of Object.entries(itemToGroupName)) {
        if (!groupItems[groupName]) {
          groupItems[groupName] = [];
        }
        groupItems[groupName].push(itemId);
      }

      // Remove existing groups and re-create based on categories
      // First, clear all existing groups (release items to canvas)
      const nextLayouts = { ...workspace.itemLayouts };
      for (const layout of Object.values(nextLayouts)) {
        layout.groupId = null;
      }

      const nextGroups: Record<string, GroupModel> = {};

      // Calculate pile positions - start from the top-left and cascade down
      const pileWidth = 280;
      const pileHeight = 240;
      const pilePadding = 20;
      const startX = 60;
      const startY = 60;
      const maxPilesPerRow = 4;

      // Get existing group positions if any to maintain some stability
      const existingGroupPositions = new Map<string, Point>();
      for (const group of Object.values(workspace.groups)) {
        existingGroupPositions.set(group.name, group.position);
      }

      // Process groups in a consistent order
      const groupNames = Object.keys(groupItems).sort();
      let pileIndex = 0;

      for (const groupName of groupNames) {
        const itemIds = groupItems[groupName];
        if (itemIds.length === 0) continue;

        // Determine pile position - use existing position if available, otherwise calculate
        let position: Point;
        if (existingGroupPositions.has(groupName)) {
          position = existingGroupPositions.get(groupName)!;
        } else {
          const col = pileIndex % maxPilesPerRow;
          const row = Math.floor(pileIndex / maxPilesPerRow);
          position = {
            x: startX + col * (pileWidth + pilePadding),
            y: startY + row * (pileHeight + pilePadding),
          };
          pileIndex++;
        }

        // Create the group
        const groupId = `group-${groupName.toLowerCase()}-${Date.now()}`;
        const group: GroupModel = {
          id: groupId,
          name: groupName,
          position,
          size: { width: pileWidth, height: pileHeight },
          collapsed: false,
          itemIds: [...itemIds],
        };

        nextGroups[groupId] = group;

        // Update item layouts to reference this group
        for (const itemId of itemIds) {
          if (nextLayouts[itemId]) {
            nextLayouts[itemId].groupId = groupId;
          } else {
            nextLayouts[itemId] = {
              id: itemId,
              position: { x: 0, y: 0 },
              groupId,
              zIndex: 0,
            };
          }
        }
      }

      set({
        workspace: {
          ...workspace,
          groups: nextGroups,
          itemLayouts: nextLayouts,
        },
      });

      // Persist the grouped state
      await get().saveWorkspace();
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
    // Expose store globally for E2E testing
    if (typeof window !== "undefined") {
      (window as any).__PILES_STORE__ = _store;
    }
  }
  return _store;
}
