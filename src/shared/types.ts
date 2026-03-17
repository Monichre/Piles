export type FileMeta = {
  id: string;
  path: string;
  name: string;
  extension: string | null;
  isDirectory: boolean;
  kind: "file" | "folder";
  createdAt: string | null;
  modifiedAt: string | null;
};

export type Point = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type ItemLayout = {
  id: string;
  position: Point;
  groupId: string | null;
  zIndex: number;
};

export type GroupModel = {
  id: string;
  name: string;
  position: Point;
  size: Size;
  collapsed: boolean;
  itemIds: string[];
};

export type WorkspaceSettings = {
  snapToGrid: boolean;
};

export type WorkspaceData = {
  folderPath: string;
  groups: Record<string, GroupModel>;
  itemLayouts: Record<string, ItemLayout>;
  settings: WorkspaceSettings;
};
