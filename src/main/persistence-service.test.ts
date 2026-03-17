import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import { createPersistenceService, createWorkspaceHash, isWorkspaceData } from "./persistence-service";
import type { WorkspaceData } from "../shared/types";

const tempDirs: string[] = [];

const createTempDir = async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "piles-persistence-"));
  tempDirs.push(tempDir);
  return tempDir;
};

const exampleWorkspace: WorkspaceData = {
  folderPath: "/tmp/piles-workspace",
  groups: {
    group_1: {
      id: "group_1",
      name: "Inbox",
      position: { x: 10, y: 20 },
      size: { width: 240, height: 160 },
      collapsed: false,
      itemIds: ["/tmp/piles-workspace/file.txt"]
    }
  },
  itemLayouts: {
    "/tmp/piles-workspace/file.txt": {
      id: "/tmp/piles-workspace/file.txt",
      position: { x: 60, y: 80 },
      groupId: "group_1",
      zIndex: 1
    }
  },
  settings: {
    snapToGrid: false
  }
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) => rm(tempDir, { force: true, recursive: true }))
  );
});

describe("persistence service", () => {
  it("creates stable hashes for folder paths", () => {
    expect(createWorkspaceHash("/tmp/example")).toHaveLength(64);
    expect(createWorkspaceHash("/tmp/example")).toBe(createWorkspaceHash("/tmp/example"));
    expect(createWorkspaceHash("/tmp/example")).not.toBe(createWorkspaceHash("/tmp/other"));
  });

  it("saves and loads canonical workspace data", async () => {
    const appDataPath = await createTempDir();
    const service = createPersistenceService({ appDataPath });

    await service.saveWorkspace(exampleWorkspace);

    await expect(service.loadWorkspace(exampleWorkspace.folderPath)).resolves.toEqual(
      exampleWorkspace
    );
  });

  it("returns null when the workspace file is missing or invalid", async () => {
    const appDataPath = await createTempDir();
    const service = createPersistenceService({ appDataPath });

    await expect(service.loadWorkspace("/tmp/missing")).resolves.toBeNull();

    const filePath = service.getWorkspaceFilePath(exampleWorkspace.folderPath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, "{\"bad\":true}", "utf8");

    await expect(service.loadWorkspace(exampleWorkspace.folderPath)).resolves.toBeNull();
  });

  it("validates workspace payloads before saving", async () => {
    const appDataPath = await createTempDir();
    const service = createPersistenceService({ appDataPath });

    expect(isWorkspaceData(exampleWorkspace)).toBe(true);
    expect(
      isWorkspaceData({
        folderPath: "/tmp/bad",
        groups: {},
        itemLayouts: {},
        settings: {}
      })
    ).toBe(false);

    await expect(
      service.saveWorkspace({
        folderPath: "/tmp/bad",
        groups: {},
        itemLayouts: {},
        settings: {} as never
      })
    ).rejects.toThrow("Workspace payload does not match the canonical contract.");
  });
});
