import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "../shared/ipc";
import { registerIpcHandlers } from "./ipc";
import { createWatchService } from "./watch-service";
import { createReconcileService } from "./reconcile-service";

describe("ipc registration", () => {
  it("registers canonical handlers and forwards calls to services", async () => {
    const handlers = new Map<string, (_event: unknown, ...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel, listener) => {
        handlers.set(channel, listener);
      }),
      removeHandler: vi.fn()
    };
    const filesystemService = {
      selectFolder: vi.fn().mockResolvedValue("/tmp/example"),
      getFolderItems: vi.fn().mockResolvedValue([]),
      openFile: vi.fn().mockResolvedValue(undefined),
      revealInFinder: vi.fn().mockResolvedValue(undefined),
      renameFile: vi.fn().mockResolvedValue({ newPath: "/tmp/renamed" }),
      trashFile: vi.fn().mockResolvedValue(undefined)
    };
    const persistenceService = {
      loadWorkspace: vi.fn().mockResolvedValue(null),
      saveWorkspace: vi.fn().mockResolvedValue(undefined),
      getWorkspaceFilePath: vi.fn()
    };
    const watchService = createWatchService();
    const reconcileService = createReconcileService({
      getFolderItems: filesystemService.getFolderItems
    });

    const { emitFolderChanged } = registerIpcHandlers({
      ipcMain,
      filesystemService,
      persistenceService,
      watchService,
      reconcileService
    });

    // 12 handlers: selectFolder, getFolderItems, loadWorkspace, saveWorkspace,
    // openFile, revealInFinder, renameFile, trashFile, watchFolder, unwatchFolder
    // plus potentially more in the future
    expect(ipcMain.handle).toHaveBeenCalled();
    expect(handlers.has(IPC_CHANNELS.getFolderItems)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.saveWorkspace)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.watchFolder)).toBe(true);
    expect(handlers.has(IPC_CHANNELS.unwatchFolder)).toBe(true);

    await handlers.get(IPC_CHANNELS.getFolderItems)?.({}, "/tmp/folder");
    await handlers.get(IPC_CHANNELS.renameFile)?.({}, "/tmp/file.txt", "renamed.txt");

    expect(filesystemService.getFolderItems).toHaveBeenCalledWith("/tmp/folder");
    expect(filesystemService.renameFile).toHaveBeenCalledWith(
      "/tmp/file.txt",
      "renamed.txt"
    );

    const sender = { send: vi.fn() };
    emitFolderChanged(sender);

    expect(sender.send).toHaveBeenCalledWith(IPC_CHANNELS.folderChanged);
  });
});
