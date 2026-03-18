import { describe, expect, it, vi } from "vitest";

import type { PilesAPI } from "../shared/ipc";
import type { FileMeta, WorkspaceData } from "../shared/types";
import { createStore } from "./store";

// ---------------------------------------------------------------------------
// Helpers (mirrored from store.test.ts for local isolation)
// ---------------------------------------------------------------------------

const makeItem = (overrides: Partial<FileMeta> = {}): FileMeta => ({
  id: "/folder/file.txt",
  path: "/folder/file.txt",
  name: "file.txt",
  extension: "txt",
  isDirectory: false,
  kind: "file",
  createdAt: null,
  modifiedAt: null,
  ...overrides,
});

const makeWorkspace = (overrides: Partial<WorkspaceData> = {}): WorkspaceData => ({
  folderPath: "/folder",
  groups: {},
  itemLayouts: {},
  settings: { snapToGrid: false },
  ...overrides,
});

const makeMockApi = (overrides: Partial<PilesAPI> = {}): PilesAPI => ({
  selectFolder: vi.fn().mockResolvedValue(null),
  getFolderItems: vi.fn().mockResolvedValue([]),
  loadWorkspace: vi.fn().mockResolvedValue(null),
  saveWorkspace: vi.fn().mockResolvedValue(undefined),
  openFile: vi.fn(),
  revealInFinder: vi.fn(),
  renameFile: vi.fn(),
  trashFile: vi.fn(),
  watchFolder: vi.fn(),
  unwatchFolder: vi.fn(),
  onFolderChanged: vi.fn(),
  ...overrides,
});

/** Create a store pre-loaded with a workspace and optional items. */
async function makeLoadedStore(
  workspaceOverrides: Partial<WorkspaceData> = {},
  items: FileMeta[] = []
) {
  const api = makeMockApi({
    getFolderItems: vi.fn().mockResolvedValue(items),
    loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace(workspaceOverrides)),
  });
  const store = createStore(api);
  await store.getState().loadFolder("/folder");
  return store;
}

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

describe("createGroup", () => {
  it("creates a new group in workspace.groups and returns its id", async () => {
    const store = await makeLoadedStore();
    const id = store.getState().createGroup("My Pile", [], { x: 100, y: 200 });

    expect(id).toBeTruthy();
    const group = store.getState().workspace!.groups[id];
    expect(group).toBeDefined();
    expect(group.name).toBe("My Pile");
    expect(group.position).toEqual({ x: 100, y: 200 });
    expect(group.collapsed).toBe(false);
    expect(group.itemIds).toEqual([]);
  });

  it("sets default size of 240×200 for new groups", async () => {
    const store = await makeLoadedStore();
    const id = store.getState().createGroup("Pile", [], { x: 0, y: 0 });
    const group = store.getState().workspace!.groups[id];
    expect(group.size).toEqual({ width: 240, height: 200 });
  });

  it("adds itemIds to the group and sets their ItemLayout.groupId", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const id = store.getState().createGroup("With Items", ["/folder/a.txt"], { x: 0, y: 0 });

    const group = store.getState().workspace!.groups[id];
    expect(group.itemIds).toContain("/folder/a.txt");

    const layout = store.getState().workspace!.itemLayouts["/folder/a.txt"];
    expect(layout.groupId).toBe(id);
  });

  it("does nothing and returns empty string when workspace is null", () => {
    const store = createStore(makeMockApi());
    const id = store.getState().createGroup("Pile", [], { x: 0, y: 0 });
    expect(id).toBe("");
    expect(store.getState().workspace).toBeNull();
  });

  it("createGroup removes items from their existing group", async () => {
    const item = makeItem({ id: "/folder/x.txt" });
    const store = await makeLoadedStore({}, [item]);

    // Create group A with item X.
    const groupA = store.getState().createGroup("A", ["/folder/x.txt"], { x: 0, y: 0 });
    expect(store.getState().workspace!.groups[groupA].itemIds).toContain("/folder/x.txt");

    // Create group B also seeded with item X.
    const groupB = store.getState().createGroup("B", ["/folder/x.txt"], { x: 200, y: 0 });

    // Group A must no longer contain the item.
    expect(store.getState().workspace!.groups[groupA].itemIds).not.toContain("/folder/x.txt");
    // Group B must contain the item.
    expect(store.getState().workspace!.groups[groupB].itemIds).toContain("/folder/x.txt");
    // itemLayouts reflects the final group.
    expect(store.getState().workspace!.itemLayouts["/folder/x.txt"]?.groupId).toBe(groupB);
  });

  it("does NOT merge FileMeta into the group record", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);
    const id = store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });

    // GroupModel has its own `name` field (pile name), but must NOT contain
    // FileMeta-specific fields like extension, kind, path, isDirectory, etc.
    const group = store.getState().workspace!.groups[id];
    expect(group).not.toHaveProperty("extension");
    expect(group).not.toHaveProperty("kind");
    expect(group).not.toHaveProperty("path");
    expect(group).not.toHaveProperty("isDirectory");
    expect(group).not.toHaveProperty("modifiedAt");
    // GroupModel fields are present
    expect(group).toHaveProperty("name", "Pile");
    expect(group).toHaveProperty("position");
    expect(group).toHaveProperty("size");
    expect(group).toHaveProperty("itemIds");
  });
});

// ---------------------------------------------------------------------------
// deleteGroup
// ---------------------------------------------------------------------------

describe("deleteGroup", () => {
  it("removes the group from workspace.groups", async () => {
    const store = await makeLoadedStore();
    const id = store.getState().createGroup("Pile", [], { x: 0, y: 0 });

    store.getState().deleteGroup(id);

    expect(store.getState().workspace!.groups[id]).toBeUndefined();
  });

  it("sets groupId to null on all former member layouts", async () => {
    const itemA = makeItem({ id: "/folder/a.txt" });
    const itemB = makeItem({ id: "/folder/b.txt", path: "/folder/b.txt", name: "b.txt" });
    const store = await makeLoadedStore({}, [itemA, itemB]);

    const id = store.getState().createGroup("Pile", ["/folder/a.txt", "/folder/b.txt"], { x: 0, y: 0 });
    store.getState().deleteGroup(id);

    expect(store.getState().workspace!.itemLayouts["/folder/a.txt"]?.groupId).toBeNull();
    expect(store.getState().workspace!.itemLayouts["/folder/b.txt"]?.groupId).toBeNull();
  });

  it("NEVER calls any file deletion API — only mutates layout state", async () => {
    const trashFile = vi.fn();
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([makeItem()]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
      trashFile,
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    const id = store.getState().createGroup("Pile", ["/folder/file.txt"], { x: 0, y: 0 });
    store.getState().deleteGroup(id);

    expect(trashFile).not.toHaveBeenCalled();
  });

  it("does nothing when the group id does not exist", async () => {
    const store = await makeLoadedStore();
    expect(() => {
      store.getState().deleteGroup("nonexistent-id");
    }).not.toThrow();
  });

  it("does nothing when workspace is null", () => {
    const store = createStore(makeMockApi());
    expect(() => {
      store.getState().deleteGroup("any-id");
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateGroup
// ---------------------------------------------------------------------------

describe("updateGroup", () => {
  it("patches the specified fields without touching others", async () => {
    const store = await makeLoadedStore();
    const id = store.getState().createGroup("Old Name", [], { x: 10, y: 20 });

    store.getState().updateGroup(id, { name: "New Name", collapsed: true });

    const group = store.getState().workspace!.groups[id];
    expect(group.name).toBe("New Name");
    expect(group.collapsed).toBe(true);
    // Position unchanged
    expect(group.position).toEqual({ x: 10, y: 20 });
  });

  it("does nothing when the group id does not exist", async () => {
    const store = await makeLoadedStore();
    expect(() => {
      store.getState().updateGroup("nonexistent", { name: "x" });
    }).not.toThrow();
  });

  it("does nothing when workspace is null", () => {
    const store = createStore(makeMockApi());
    expect(() => {
      store.getState().updateGroup("any", { name: "x" });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// addItemToGroup
// ---------------------------------------------------------------------------

describe("addItemToGroup", () => {
  it("adds an item to a group's itemIds and updates its layout groupId", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const groupId = store.getState().createGroup("Pile", [], { x: 0, y: 0 });
    store.getState().addItemToGroup("/folder/a.txt", groupId);

    const group = store.getState().workspace!.groups[groupId];
    expect(group.itemIds).toContain("/folder/a.txt");

    const layout = store.getState().workspace!.itemLayouts["/folder/a.txt"];
    expect(layout.groupId).toBe(groupId);
  });

  it("removes the item from its previous group before adding to the new one", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const groupA = store.getState().createGroup("A", ["/folder/a.txt"], { x: 0, y: 0 });
    const groupB = store.getState().createGroup("B", [], { x: 200, y: 0 });

    store.getState().addItemToGroup("/folder/a.txt", groupB);

    // No longer in group A
    expect(store.getState().workspace!.groups[groupA].itemIds).not.toContain("/folder/a.txt");
    // Now in group B
    expect(store.getState().workspace!.groups[groupB].itemIds).toContain("/folder/a.txt");
    // Layout updated
    expect(store.getState().workspace!.itemLayouts["/folder/a.txt"]?.groupId).toBe(groupB);
  });

  it("is idempotent — adding an already-member item does not duplicate it", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const groupId = store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });
    store.getState().addItemToGroup("/folder/a.txt", groupId);

    const group = store.getState().workspace!.groups[groupId];
    const count = group.itemIds.filter((id) => id === "/folder/a.txt").length;
    expect(count).toBe(1);
  });

  it("enforces single-group membership — item can only belong to one group", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const g1 = store.getState().createGroup("G1", [], { x: 0, y: 0 });
    const g2 = store.getState().createGroup("G2", [], { x: 300, y: 0 });

    store.getState().addItemToGroup("/folder/a.txt", g1);
    store.getState().addItemToGroup("/folder/a.txt", g2);

    // Item must be in exactly one group
    const inG1 = store.getState().workspace!.groups[g1].itemIds.includes("/folder/a.txt");
    const inG2 = store.getState().workspace!.groups[g2].itemIds.includes("/folder/a.txt");
    expect(inG1).toBe(false);
    expect(inG2).toBe(true);

    // Layout reflects the final group
    expect(store.getState().workspace!.itemLayouts["/folder/a.txt"]?.groupId).toBe(g2);
  });
});

// ---------------------------------------------------------------------------
// removeItemFromGroup
// ---------------------------------------------------------------------------

describe("removeItemFromGroup", () => {
  it("sets the item's layout groupId to null", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const groupId = store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });
    store.getState().removeItemFromGroup("/folder/a.txt");

    expect(store.getState().workspace!.itemLayouts["/folder/a.txt"]?.groupId).toBeNull();
  });

  it("removes the item from the group's itemIds", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    const groupId = store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });
    store.getState().removeItemFromGroup("/folder/a.txt");

    expect(store.getState().workspace!.groups[groupId].itemIds).not.toContain("/folder/a.txt");
  });

  it("does nothing when the item is not in any group", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const store = await makeLoadedStore({}, [item]);

    expect(() => {
      store.getState().removeItemFromGroup("/folder/a.txt");
    }).not.toThrow();
  });

  it("does nothing when workspace is null", () => {
    const store = createStore(makeMockApi());
    expect(() => {
      store.getState().removeItemFromGroup("/folder/a.txt");
    }).not.toThrow();
  });

  it("does NOT delete files — only mutates layout state", async () => {
    const trashFile = vi.fn();
    const item = makeItem({ id: "/folder/a.txt" });
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([item]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
      trashFile,
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });
    store.getState().removeItemFromGroup("/folder/a.txt");

    expect(trashFile).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Persistence invariants
// ---------------------------------------------------------------------------

describe("pile persistence invariants", () => {
  it("groups are serialised as part of WorkspaceData (saveWorkspace receives them)", async () => {
    const saveWorkspace = vi.fn().mockResolvedValue(undefined);
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
      saveWorkspace,
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().createGroup("Pile", [], { x: 0, y: 0 });
    await store.getState().saveWorkspace();

    expect(saveWorkspace).toHaveBeenCalledOnce();
    const saved = saveWorkspace.mock.calls[0][0] as WorkspaceData;
    expect(Object.keys(saved.groups).length).toBe(1);
  });

  it("collapse state persists through updateGroup and saveWorkspace", async () => {
    const saveWorkspace = vi.fn().mockResolvedValue(undefined);
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
      saveWorkspace,
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    const id = store.getState().createGroup("Pile", [], { x: 0, y: 0 });
    store.getState().updateGroup(id, { collapsed: true });
    await store.getState().saveWorkspace();

    const saved = saveWorkspace.mock.calls[0][0] as WorkspaceData;
    expect(saved.groups[id].collapsed).toBe(true);
  });

  it("membership persists: itemLayouts.groupId is included in saved workspace", async () => {
    const saveWorkspace = vi.fn().mockResolvedValue(undefined);
    const item = makeItem({ id: "/folder/a.txt" });
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([item]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
      saveWorkspace,
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    const id = store.getState().createGroup("Pile", ["/folder/a.txt"], { x: 0, y: 0 });
    await store.getState().saveWorkspace();

    const saved = saveWorkspace.mock.calls[0][0] as WorkspaceData;
    expect(saved.itemLayouts["/folder/a.txt"]?.groupId).toBe(id);
  });
});
