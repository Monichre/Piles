import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createFilesystemService } from "./filesystem-service";

const tempDirs: string[] = [];

const createTempDir = async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "piles-fs-"));
  tempDirs.push(tempDir);
  return tempDir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
  );
});

describe("filesystem service", () => {
  it("returns the selected folder path or null", async () => {
    const showOpenDialog = vi
      .fn()
      .mockResolvedValueOnce({ canceled: true, filePaths: [] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ["/tmp/example"] });

    const service = createFilesystemService({
      dialog: { showOpenDialog },
      shell: {
        openPath: vi.fn(),
        showItemInFolder: vi.fn(),
      trashItem: vi.fn()
      }
    });

    await expect(service.selectFolder()).resolves.toBeNull();
    await expect(service.selectFolder()).resolves.toBe("/tmp/example");
  });

  it("reads only direct folder contents and maps canonical metadata", async () => {
    const folderPath = await createTempDir();
    await writeFile(path.join(folderPath, "notes.txt"), "hello");
    await mkdir(path.join(folderPath, "Photos"));
    await writeFile(path.join(folderPath, "README"), "no extension");

    const service = createFilesystemService({
      dialog: { showOpenDialog: vi.fn() },
      shell: {
        openPath: vi.fn(),
        showItemInFolder: vi.fn(),
        trashItem: vi.fn()
      }
    });

    const items = await service.getFolderItems(folderPath);

    expect(items.map((item) => item.name)).toEqual(["notes.txt", "Photos", "README"]);
    expect(items.map((item) => item.kind)).toEqual(["file", "folder", "file"]);
    expect(items.map((item) => item.extension)).toEqual(["txt", null, null]);
    expect(items.every((item) => item.id === item.path)).toBe(true);
  });

  it("renames files in place and returns the new path", async () => {
    const folderPath = await createTempDir();
    const oldPath = path.join(folderPath, "before.txt");
    const expectedPath = path.join(folderPath, "after.txt");
    await writeFile(oldPath, "hello");

    const service = createFilesystemService({
      dialog: { showOpenDialog: vi.fn() },
      shell: {
        openPath: vi.fn(),
        showItemInFolder: vi.fn(),
        trashItem: vi.fn()
      }
    });

    await expect(service.renameFile(oldPath, "after.txt")).resolves.toEqual({
      newPath: expectedPath
    });
    await expect(readFile(expectedPath, "utf8")).resolves.toBe("hello");
  });

  it("routes file actions through shell integrations", async () => {
    const shell = {
      openPath: vi.fn().mockResolvedValue(""),
      showItemInFolder: vi.fn(),
      trashItem: vi.fn().mockResolvedValue(undefined)
    };

    const service = createFilesystemService({
      dialog: { showOpenDialog: vi.fn() },
      shell
    });

    await expect(service.openFile("/tmp/example.txt")).resolves.toBeUndefined();
    await expect(service.revealInFinder("/tmp/example.txt")).resolves.toBeUndefined();
    await expect(service.trashFile("/tmp/example.txt")).resolves.toBeUndefined();

    expect(shell.openPath).toHaveBeenCalledWith("/tmp/example.txt");
    expect(shell.showItemInFolder).toHaveBeenCalledWith("/tmp/example.txt");
    expect(shell.trashItem).toHaveBeenCalledWith("/tmp/example.txt");
  });
});
