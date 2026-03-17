import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { IPC_CHANNELS, PILES_API_METHODS, createPreloadPilesApi } from "./ipc";
import type { PilesAPI } from "./ipc";

describe("shared contracts", () => {
  it("defines the canonical preload API surface", () => {
    expect(PILES_API_METHODS).toEqual([
      "selectFolder",
      "getFolderItems",
      "loadWorkspace",
      "saveWorkspace",
      "openFile",
      "revealInFinder",
      "renameFile",
      "trashFile",
      "watchFolder",
      "unwatchFolder",
      "onFolderChanged"
    ]);
  });

  it("builds a preload API matching the canonical contract", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const on = vi.fn();
    const removeListener = vi.fn();
    const api = createPreloadPilesApi({ invoke, on, removeListener });

    expect(Object.keys(api).sort()).toEqual([...PILES_API_METHODS].sort());
    expectTypeOf(api).toMatchTypeOf<PilesAPI>();

    await api.getFolderItems("/tmp/example");
    api.onFolderChanged(() => {});

    expect(invoke).toHaveBeenCalledWith(IPC_CHANNELS.getFolderItems, "/tmp/example");
    expect(on).toHaveBeenCalledWith(IPC_CHANNELS.folderChanged, expect.any(Function));
  });
});
