import path from "node:path";
import { createHash } from "node:crypto";
import { promises as nodeFs } from "node:fs";

import type { GroupModel, ItemLayout, WorkspaceData, WorkspaceSettings } from "../shared/types";

type FileSystemLike = Pick<
  typeof nodeFs,
  "mkdir" | "readFile" | "rename" | "rm" | "writeFile"
>;

export type PersistenceServiceDependencies = {
  appDataPath: string;
  fs?: FileSystemLike;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isPoint = (value: unknown): value is { x: number; y: number } => {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
};

const isSize = (value: unknown): value is { width: number; height: number } => {
  return (
    isRecord(value) &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
};

const isItemLayout = (value: unknown): value is ItemLayout => {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isPoint(value.position) &&
    (typeof value.groupId === "string" || value.groupId === null) &&
    typeof value.zIndex === "number"
  );
};

const isGroupModel = (value: unknown): value is GroupModel => {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isPoint(value.position) &&
    isSize(value.size) &&
    typeof value.collapsed === "boolean" &&
    isStringArray(value.itemIds)
  );
};

const isWorkspaceSettings = (value: unknown): value is WorkspaceSettings => {
  return isRecord(value) && typeof value.snapToGrid === "boolean";
};

export const isWorkspaceData = (value: unknown): value is WorkspaceData => {
  if (!isRecord(value)) {
    return false;
  }

  const groups = value.groups;
  const itemLayouts = value.itemLayouts;

  return (
    typeof value.folderPath === "string" &&
    isRecord(groups) &&
    Object.values(groups).every(isGroupModel) &&
    isRecord(itemLayouts) &&
    Object.values(itemLayouts).every(isItemLayout) &&
    isWorkspaceSettings(value.settings)
  );
};

export const createWorkspaceHash = (folderPath: string): string => {
  return createHash("sha256").update(folderPath).digest("hex");
};

export const createPersistenceService = ({
  appDataPath,
  fs = nodeFs
}: PersistenceServiceDependencies) => {
  const workspacesDir = path.join(appDataPath, "Piles", "workspaces");

  const getWorkspaceFilePath = (folderPath: string): string => {
    return path.join(workspacesDir, `${createWorkspaceHash(folderPath)}.json`);
  };

  const ensureWorkspaceDir = async (): Promise<void> => {
    await fs.mkdir(workspacesDir, { recursive: true });
  };

  const loadWorkspace = async (
    folderPath: string
  ): Promise<WorkspaceData | null> => {
    const filePath = getWorkspaceFilePath(folderPath);

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return isWorkspaceData(parsed) ? parsed : null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      return null;
    }
  };

  const saveWorkspace = async (workspace: WorkspaceData): Promise<void> => {
    if (!isWorkspaceData(workspace)) {
      throw new Error("Workspace payload does not match the canonical contract.");
    }

    await ensureWorkspaceDir();

    const filePath = getWorkspaceFilePath(workspace.folderPath);
    const tempPath = `${filePath}.tmp`;
    const serialized = JSON.stringify(workspace, null, 2);

    await fs.writeFile(tempPath, serialized, "utf8");
    await fs.rename(tempPath, filePath);
    await fs.rm(tempPath, { force: true });
  };

  return {
    getWorkspaceFilePath,
    loadWorkspace,
    saveWorkspace
  };
};

export type PersistenceService = ReturnType<typeof createPersistenceService>;
