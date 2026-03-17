import path from "node:path";
import { promises as nodeFs } from "node:fs";

import type { FileMeta } from "../shared/types";

type DialogLike = {
  showOpenDialog: (
    ...args: unknown[]
  ) => Promise<{ canceled: boolean; filePaths: string[] }>;
};

type ShellLike = {
  openPath: (targetPath: string) => Promise<string>;
  showItemInFolder: (targetPath: string) => void;
  trashItem: (targetPath: string) => Promise<void>;
};

type FileSystemLike = Pick<typeof nodeFs, "readdir" | "stat" | "rename">;

export type FilesystemServiceDependencies = {
  dialog: DialogLike;
  shell: ShellLike;
  fs?: FileSystemLike;
};

const normalizeExtension = (entryName: string, isDirectory: boolean): string | null => {
  if (isDirectory) {
    return null;
  }

  const extension = path.extname(entryName).slice(1).trim().toLowerCase();
  return extension.length > 0 ? extension : null;
};

const toFileMeta = async (
  folderPath: string,
  entryName: string,
  fs: FileSystemLike
): Promise<FileMeta> => {
  const entryPath = path.join(folderPath, entryName);
  const stats = await fs.stat(entryPath);
  const isDirectory = stats.isDirectory();

  return {
    id: entryPath,
    path: entryPath,
    name: entryName,
    extension: normalizeExtension(entryName, isDirectory),
    isDirectory,
    kind: isDirectory ? "folder" : "file",
    createdAt: Number.isNaN(stats.birthtimeMs) ? null : stats.birthtime.toISOString(),
    modifiedAt: Number.isNaN(stats.mtimeMs) ? null : stats.mtime.toISOString()
  };
};

export const createFilesystemService = ({
  dialog,
  shell,
  fs = nodeFs
}: FilesystemServiceDependencies) => {
  const selectFolder = async (
    _browserWindow?: unknown
  ): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: "Select a folder for Piles",
      properties: ["openDirectory"]
    });

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] ?? null;
  };

  const getFolderItems = async (folderPath: string): Promise<FileMeta[]> => {
    const entries = await fs.readdir(folderPath);
    const sortedEntries = [...entries].sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
    );

    return Promise.all(sortedEntries.map((entryName) => toFileMeta(folderPath, entryName, fs)));
  };

  const openFile = async (targetPath: string): Promise<void> => {
    const message = await shell.openPath(targetPath);

    if (message) {
      throw new Error(message);
    }
  };

  const revealInFinder = async (targetPath: string): Promise<void> => {
    shell.showItemInFolder(targetPath);
  };

  const renameFile = async (
    targetPath: string,
    newName: string
  ): Promise<{ newPath: string }> => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      throw new Error("New name must not be empty.");
    }

    const newPath = path.join(path.dirname(targetPath), trimmedName);
    await fs.rename(targetPath, newPath);

    return { newPath };
  };

  const trashFile = async (targetPath: string): Promise<void> => {
    await shell.trashItem(targetPath);
  };

  return {
    selectFolder,
    getFolderItems,
    openFile,
    revealInFinder,
    renameFile,
    trashFile
  };
};

export type FilesystemService = ReturnType<typeof createFilesystemService>;
