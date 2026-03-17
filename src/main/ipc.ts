import { app, dialog, ipcMain, shell } from "electron";
import type { OpenDialogOptions } from "electron";

import { IPC_CHANNELS } from "../shared/ipc";
import {
  createFilesystemService,
  type FilesystemService
} from "./filesystem-service";
import {
  createPersistenceService,
  type PersistenceService
} from "./persistence-service";

type IpcMainLike = {
  handle: (
    channel: string,
    listener: (_event: unknown, ...args: unknown[]) => unknown
  ) => void;
  removeHandler: (channel: string) => void;
};

type SenderLike = {
  send: (channel: string) => void;
};

type IpcRegistrationDependencies = {
  ipcMain: IpcMainLike;
  filesystemService: FilesystemService;
  persistenceService: PersistenceService;
};

export const registerIpcHandlers = ({
  ipcMain,
  filesystemService,
  persistenceService
}: IpcRegistrationDependencies) => {
  const handlerEntries: Array<[string, (_event: unknown, ...args: unknown[]) => unknown]> = [
    [IPC_CHANNELS.selectFolder, () => filesystemService.selectFolder()],
    [
      IPC_CHANNELS.getFolderItems,
      (_event, folderPath) => filesystemService.getFolderItems(folderPath as string)
    ],
    [
      IPC_CHANNELS.loadWorkspace,
      (_event, folderPath) => persistenceService.loadWorkspace(folderPath as string)
    ],
    [
      IPC_CHANNELS.saveWorkspace,
      (_event, workspace) =>
        persistenceService.saveWorkspace(workspace as Parameters<PersistenceService["saveWorkspace"]>[0])
    ],
    [IPC_CHANNELS.openFile, (_event, targetPath) => filesystemService.openFile(targetPath as string)],
    [
      IPC_CHANNELS.revealInFinder,
      (_event, targetPath) => filesystemService.revealInFinder(targetPath as string)
    ],
    [
      IPC_CHANNELS.renameFile,
      (_event, targetPath, newName) =>
        filesystemService.renameFile(targetPath as string, newName as string)
    ],
    [IPC_CHANNELS.trashFile, (_event, targetPath) => filesystemService.trashFile(targetPath as string)],
    [IPC_CHANNELS.watchFolder, async () => undefined],
    [IPC_CHANNELS.unwatchFolder, async () => undefined]
  ];

  for (const [channel, listener] of handlerEntries) {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, listener);
  }

  return {
    emitFolderChanged: (sender: SenderLike) => {
      sender.send(IPC_CHANNELS.folderChanged);
    }
  };
};

export const registerDefaultIpcHandlers = () => {
  const filesystemService = createFilesystemService({
    dialog: {
      showOpenDialog: (options) =>
        dialog.showOpenDialog(options as OpenDialogOptions)
    },
    shell: {
      openPath: (targetPath) => shell.openPath(targetPath),
      showItemInFolder: (targetPath) => shell.showItemInFolder(targetPath),
      trashItem: (targetPath) => shell.trashItem(targetPath)
    }
  });
  const persistenceService = createPersistenceService({
    appDataPath: app.getPath("userData")
  });

  return registerIpcHandlers({
    ipcMain,
    filesystemService,
    persistenceService
  });
};
