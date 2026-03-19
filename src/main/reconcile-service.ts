import type { FileMeta, ItemLayout, GroupModel, WorkspaceData } from "../shared/types";

export type ReconciliationResult = {
  /** Items that still exist in the filesystem and in the persisted layout. */
  survivingIds: string[];
  /** Items that were on the filesystem but are new (no persisted layout). */
  addedIds: string[];
  /** Items that were in the persisted layout but no longer exist on filesystem. */
  removedIds: string[];
  /** Combined itemLayouts with stale entries removed, new items added with default layout. */
  reconciledItemLayouts: Record<string, ItemLayout>;
  /** Updated groups with stale itemIds removed. */
  reconciledGroups: Record<string, GroupModel>;
};

export type ReconcileDeps = {
  getFolderItems: (folderPath: string) => Promise<FileMeta[]>;
};

const DEFAULT_ITEM_LAYOUT: Omit<ItemLayout, "id"> = {
  position: { x: 0, y: 0 },
  groupId: null,
  zIndex: 0,
};

/**
 * Reconciles live filesystem contents with persisted workspace data.
 *
 * This is the core logic for the watch/reconcile flow:
 * - Path-based identity: items are identified by their FileMeta.id (which equals path)
 * - External add: new items appear on filesystem but have no persisted layout
 * - External delete: items that were in layout but no longer exist on filesystem
 * - External rename: treated as remove+add (old path removed, new path added)
 *
 * The function preserves layout for surviving items and safely removes
 * stale layout references.
 */
export const createReconcileService = (deps: ReconcileDeps) => {
  const reconcile = async (
    folderPath: string,
    workspace: WorkspaceData
  ): Promise<ReconciliationResult> => {
    const liveItems = await deps.getFolderItems(folderPath);
    const liveIds = new Set(liveItems.map((item) => item.id));
    const persistedIds = new Set(Object.keys(workspace.itemLayouts));

    // Determine which IDs are new, removed, or surviving
    const addedIds: string[] = [];
    const removedIds: string[] = [];
    const survivingIds: string[] = [];

    for (const liveId of liveIds) {
      if (!persistedIds.has(liveId)) {
        addedIds.push(liveId);
      } else {
        survivingIds.push(liveId);
      }
    }

    for (const persistedId of persistedIds) {
      if (!liveIds.has(persistedId)) {
        removedIds.push(persistedId);
      }
    }

    // Build reconciled itemLayouts:
    // - Keep layout for surviving items
    // - Add default layout for new items
    // - Stale entries (removed items) are simply not included
    const reconciledItemLayouts: Record<string, ItemLayout> = {};

    // Keep surviving items' layouts
    for (const id of survivingIds) {
      const layout = workspace.itemLayouts[id];
      if (layout) {
        reconciledItemLayouts[id] = layout;
      } else {
        // Should not happen if persistedIds includes survivingIds, but defensive
        reconciledItemLayouts[id] = { id, ...DEFAULT_ITEM_LAYOUT };
      }
    }

    // Add default layouts for new items
    for (const id of addedIds) {
      reconciledItemLayouts[id] = { id, ...DEFAULT_ITEM_LAYOUT };
    }

    // Build reconciled groups:
    // - Remove stale itemIds from groups (items that no longer exist)
    const reconciledGroups: Record<string, GroupModel> = {};

    for (const [groupId, group] of Object.entries(workspace.groups)) {
      const survivingGroupItemIds = group.itemIds.filter((itemId) =>
        liveIds.has(itemId)
      );
      reconciledGroups[groupId] = {
        ...group,
        itemIds: survivingGroupItemIds,
      };
    }

    return {
      survivingIds,
      addedIds,
      removedIds,
      reconciledItemLayouts,
      reconciledGroups,
    };
  };

  return { reconcile };
};

export type ReconcileService = ReturnType<typeof createReconcileService>;
