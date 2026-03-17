import type { FileMeta, WorkspaceData } from "./types";

export interface PilesAPI {
  selectFolder: () => Promise<string | null>;
  getFolderItems: (folderPath: string) => Promise<FileMeta[]>;
  loadWorkspace: (folderPath: string) => Promise<WorkspaceData | null>;
  saveWorkspace: (workspace: WorkspaceData) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  revealInFinder: (path: string) => Promise<void>;
  renameFile: (path: string, newName: string) => Promise<{ newPath: string }>;
  trashFile: (path: string) => Promise<void>;
  watchFolder: (folderPath: string) => Promise<void>;
  unwatchFolder: () => Promise<void>;
  onFolderChanged: (callback: () => void) => () => void;
}

type IpcRendererLike = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (...args: unknown[]) => void) => void;
  removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
};

export const PILES_API_METHODS = [
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
] as const satisfies ReadonlyArray<keyof PilesAPI>;

export const IPC_CHANNELS = {
  selectFolder: "piles:select-folder",
  getFolderItems: "piles:get-folder-items",
  loadWorkspace: "piles:load-workspace",
  saveWorkspace: "piles:save-workspace",
  openFile: "piles:open-file",
  revealInFinder: "piles:reveal-in-finder",
  renameFile: "piles:rename-file",
  trashFile: "piles:trash-file",
  watchFolder: "piles:watch-folder",
  unwatchFolder: "piles:unwatch-folder",
  folderChanged: "piles:folder-changed"
} as const;

export const createPreloadPilesApi = (
  ipcRenderer: IpcRendererLike
): PilesAPI => {
  return {
    selectFolder: () =>
      ipcRenderer.invoke(IPC_CHANNELS.selectFolder) as Promise<string | null>,
    getFolderItems: (folderPath) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.getFolderItems,
        folderPath
      ) as Promise<FileMeta[]>,
    loadWorkspace: (folderPath) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.loadWorkspace,
        folderPath
      ) as Promise<WorkspaceData | null>,
    saveWorkspace: (workspace) =>
      ipcRenderer.invoke(IPC_CHANNELS.saveWorkspace, workspace) as Promise<void>,
    openFile: (targetPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.openFile, targetPath) as Promise<void>,
    revealInFinder: (targetPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.revealInFinder, targetPath) as Promise<void>,
    renameFile: (targetPath, newName) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.renameFile,
        targetPath,
        newName
      ) as Promise<{ newPath: string }>,
    trashFile: (targetPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.trashFile, targetPath) as Promise<void>,
    watchFolder: (folderPath) =>
      ipcRenderer.invoke(IPC_CHANNELS.watchFolder, folderPath) as Promise<void>,
    unwatchFolder: () =>
      ipcRenderer.invoke(IPC_CHANNELS.unwatchFolder) as Promise<void>,
    onFolderChanged: (callback) => {
      const listener = () => {
        callback();
      };

      ipcRenderer.on(IPC_CHANNELS.folderChanged, listener);

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.folderChanged, listener);
      };
    }
  };
};
