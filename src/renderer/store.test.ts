import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PilesAPI } from "../shared/ipc";
import type { FileMeta, WorkspaceData } from "../shared/types";
import { createStore } from "./store";

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createStore — initial state", () => {
  it("starts in idle status with no folder or items", () => {
    const store = createStore(makeMockApi());
    const state = store.getState();

    expect(state.status).toBe("idle");
    expect(state.folderPath).toBeNull();
    expect(state.items).toEqual([]);
    expect(state.workspace).toBeNull();
    expect(state.error).toBeNull();
  });
});

describe("loadFolder", () => {
  it("transitions through loading → loaded and stores items and workspace", async () => {
    const item = makeItem();
    const workspace = makeWorkspace({ folderPath: "/folder" });

    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([item]),
      loadWorkspace: vi.fn().mockResolvedValue(workspace),
    });

    const store = createStore(api);
    const statuses: string[] = [];
    store.subscribe((s) => statuses.push(s.status));

    await store.getState().loadFolder("/folder");

    const final = store.getState();
    expect(final.status).toBe("loaded");
    expect(final.folderPath).toBe("/folder");
    expect(final.items).toEqual([item]);
    expect(final.workspace).toEqual(workspace);
    expect(final.error).toBeNull();

    expect(statuses).toContain("loading");
    expect(statuses).toContain("loaded");
  });

  it("seeds a minimal workspace when none exists on disk", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(null),
    });

    const store = createStore(api);
    await store.getState().loadFolder("/new-folder");

    const { workspace } = store.getState();
    expect(workspace).not.toBeNull();
    expect(workspace!.folderPath).toBe("/new-folder");
    expect(workspace!.groups).toEqual({});
    expect(workspace!.itemLayouts).toEqual({});
    expect(workspace!.settings).toEqual({ snapToGrid: false });
  });

  it("transitions to error state when getFolderItems rejects", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockRejectedValue(new Error("ENOENT")),
    });

    const store = createStore(api);
    await store.getState().loadFolder("/bad-path");

    const final = store.getState();
    expect(final.status).toBe("error");
    expect(final.error).toBe("ENOENT");
    expect(final.items).toEqual([]);
    expect(final.workspace).toBeNull();
  });

  it("transitions to error state when loadWorkspace rejects", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([makeItem()]),
      loadWorkspace: vi.fn().mockRejectedValue(new Error("parse error")),
    });

    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toBe("parse error");
  });

  it("fetches items and workspace in parallel (both APIs called once)", async () => {
    const getFolderItems = vi.fn().mockResolvedValue([]);
    const loadWorkspace = vi.fn().mockResolvedValue(null);
    const api = makeMockApi({ getFolderItems, loadWorkspace });

    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    expect(getFolderItems).toHaveBeenCalledOnce();
    expect(loadWorkspace).toHaveBeenCalledOnce();
  });

  it("discards stale loadFolder results when called concurrently", async () => {
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => {
      resolveFirst = res;
    });

    const api = makeMockApi({
      getFolderItems: vi
        .fn()
        .mockImplementationOnce(async () => {
          await firstDone;
          return [];
        })
        .mockResolvedValue([
          makeItem({ id: "/b/f.txt", path: "/b/f.txt", name: "f.txt", extension: "txt" }),
        ]),
      loadWorkspace: vi.fn().mockResolvedValue(null),
    });

    const store = createStore(api);

    // Start first load — will hang until resolveFirst() is called.
    const first = store.getState().loadFolder("/a");
    // Start second load — resolves immediately and should win.
    await store.getState().loadFolder("/b");

    // Now unblock the first load (now stale).
    resolveFirst();
    await first;

    const state = store.getState();
    expect(state.folderPath).toBe("/b");
    expect(state.items[0]?.name).toBe("f.txt");
  });

  it("does not merge FileMeta and ItemLayout — they remain on separate fields", async () => {
    const item = makeItem({ id: "/folder/a.txt" });
    const workspace = makeWorkspace({
      itemLayouts: {
        "/folder/a.txt": {
          id: "/folder/a.txt",
          position: { x: 100, y: 200 },
          groupId: null,
          zIndex: 1,
        },
      },
    });

    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([item]),
      loadWorkspace: vi.fn().mockResolvedValue(workspace),
    });

    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    const state = store.getState();

    // FileMeta is on state.items
    expect(state.items[0]).not.toHaveProperty("position");
    expect(state.items[0]).not.toHaveProperty("zIndex");

    // ItemLayout is on state.workspace.itemLayouts — separate
    expect(state.workspace!.itemLayouts["/folder/a.txt"]).not.toHaveProperty("name");
    expect(state.workspace!.itemLayouts["/folder/a.txt"]).not.toHaveProperty("extension");

    // Both accessible independently without merging
    const meta = state.items.find((i) => i.id === "/folder/a.txt");
    const layout = state.workspace!.itemLayouts["/folder/a.txt"];
    expect(meta).toBeDefined();
    expect(layout).toBeDefined();
    expect(meta).not.toBe(layout);
  });
});

describe("openFolder", () => {
  it("does nothing when the user cancels the folder picker", async () => {
    const api = makeMockApi({
      selectFolder: vi.fn().mockResolvedValue(null),
    });

    const store = createStore(api);
    await store.getState().openFolder();

    expect(store.getState().status).toBe("idle");
    expect(api.getFolderItems).not.toHaveBeenCalled();
  });

  it("calls loadFolder with the selected path when user picks a folder", async () => {
    const item = makeItem();
    const api = makeMockApi({
      selectFolder: vi.fn().mockResolvedValue("/chosen"),
      getFolderItems: vi.fn().mockResolvedValue([item]),
      loadWorkspace: vi.fn().mockResolvedValue(null),
    });

    const store = createStore(api);
    await store.getState().openFolder();

    expect(store.getState().status).toBe("loaded");
    expect(store.getState().folderPath).toBe("/chosen");
    expect(api.getFolderItems).toHaveBeenCalledWith("/chosen");
  });
});

describe("updateItemLayout", () => {
  it("creates a new layout entry when the id doesn't exist yet", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([makeItem()]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().updateItemLayout("new-item", { position: { x: 50, y: 75 } });

    const layout = store.getState().workspace!.itemLayouts["new-item"];
    expect(layout).toBeDefined();
    expect(layout.id).toBe("new-item");
    expect(layout.position).toEqual({ x: 50, y: 75 });
    expect(layout.groupId).toBeNull();
    expect(layout.zIndex).toBe(0);
  });

  it("merges patch onto an existing layout entry", async () => {
    const workspace = makeWorkspace({
      itemLayouts: {
        "a": { id: "a", position: { x: 10, y: 20 }, groupId: null, zIndex: 2 },
      },
    });
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(workspace),
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().updateItemLayout("a", { position: { x: 100, y: 200 } });

    const layout = store.getState().workspace!.itemLayouts["a"];
    expect(layout.position).toEqual({ x: 100, y: 200 });
    // zIndex preserved from existing entry
    expect(layout.zIndex).toBe(2);
    expect(layout.groupId).toBeNull();
  });

  it("does nothing when workspace is null", () => {
    const store = createStore(makeMockApi());
    // workspace is null (idle state)
    expect(() => {
      store.getState().updateItemLayout("x", { position: { x: 0, y: 0 } });
    }).not.toThrow();
    expect(store.getState().workspace).toBeNull();
  });
});

describe("updateItemLayouts", () => {
  it("batch-creates multiple layout entries that don't exist", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().updateItemLayouts({
      "x": { id: "x", position: { x: 10, y: 20 }, zIndex: 5 },
      "y": { id: "y", position: { x: 30, y: 40 }, zIndex: 5 },
    });

    const layouts = store.getState().workspace!.itemLayouts;
    expect(layouts["x"].position).toEqual({ x: 10, y: 20 });
    expect(layouts["x"].zIndex).toBe(5);
    expect(layouts["x"].groupId).toBeNull();
    expect(layouts["y"].position).toEqual({ x: 30, y: 40 });
  });

  it("merges patches onto existing entries and preserves untouched entries", async () => {
    const workspace = makeWorkspace({
      itemLayouts: {
        "a": { id: "a", position: { x: 10, y: 20 }, groupId: null, zIndex: 1 },
        "b": { id: "b", position: { x: 50, y: 60 }, groupId: null, zIndex: 1 },
      },
    });
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(workspace),
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    // Only update "a"; "b" should be untouched
    store.getState().updateItemLayouts({
      "a": { position: { x: 999, y: 888 }, zIndex: 3 },
    });

    const layouts = store.getState().workspace!.itemLayouts;
    expect(layouts["a"].position).toEqual({ x: 999, y: 888 });
    expect(layouts["a"].zIndex).toBe(3);
    // "b" unchanged
    expect(layouts["b"].position).toEqual({ x: 50, y: 60 });
    expect(layouts["b"].zIndex).toBe(1);
  });

  it("does nothing when workspace is null", () => {
    const store = createStore(makeMockApi());
    expect(() => {
      store.getState().updateItemLayouts({ "x": { position: { x: 0, y: 0 } } });
    }).not.toThrow();
    expect(store.getState().workspace).toBeNull();
  });

  it("does not merge FileMeta into ItemLayout during batch update", async () => {
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(makeWorkspace()),
    });
    const store = createStore(api);
    await store.getState().loadFolder("/folder");

    store.getState().updateItemLayouts({
      "z": { id: "z", position: { x: 5, y: 5 }, zIndex: 0 },
    });

    const layout = store.getState().workspace!.itemLayouts["z"];
    expect(layout).not.toHaveProperty("name");
    expect(layout).not.toHaveProperty("extension");
    expect(layout).not.toHaveProperty("kind");
  });
});

describe("saveWorkspace", () => {
  it("calls api.saveWorkspace with the current workspace", async () => {
    const workspace = makeWorkspace();
    const saveWorkspace = vi.fn().mockResolvedValue(undefined);
    const api = makeMockApi({
      getFolderItems: vi.fn().mockResolvedValue([]),
      loadWorkspace: vi.fn().mockResolvedValue(workspace),
      saveWorkspace,
    });

    const store = createStore(api);
    await store.getState().loadFolder("/folder");
    await store.getState().saveWorkspace();

    expect(saveWorkspace).toHaveBeenCalledOnce();
    expect(saveWorkspace).toHaveBeenCalledWith(store.getState().workspace);
  });

  it("does nothing when no workspace is loaded", async () => {
    const saveWorkspace = vi.fn();
    const api = makeMockApi({ saveWorkspace });

    const store = createStore(api);
    // status is "idle", workspace is null
    await store.getState().saveWorkspace();

    expect(saveWorkspace).not.toHaveBeenCalled();
  });
});
