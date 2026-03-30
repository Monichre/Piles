import { describe, expect, it } from "vitest";

import type { FileMeta, ItemLayout } from "../shared/types";

import { buildFallbackPositions } from "./canvas-layout";

function makeItem(id: string): FileMeta {
  return {
    id,
    path: id,
    name: id.split("/").at(-1) ?? id,
    extension: null,
    isDirectory: false,
    kind: "file",
    createdAt: null,
    modifiedAt: null,
  };
}

describe("buildFallbackPositions", () => {
  it("uses a neutral staged layout when the workspace has no saved item layouts", () => {
    const items = [makeItem("/folder/a.txt"), makeItem("/folder/b.txt"), makeItem("/folder/c.txt")];

    expect(buildFallbackPositions(items, {})).toEqual({
      "/folder/a.txt": { x: 56, y: 156 },
      "/folder/b.txt": { x: 180, y: 156 },
      "/folder/c.txt": { x: 304, y: 156 },
    });
  });

  it("keeps the existing auto-grid behavior once any item layout has been saved", () => {
    const items = [makeItem("/folder/a.txt"), makeItem("/folder/b.txt")];
    const itemLayouts: Record<string, ItemLayout> = {
      "/folder/a.txt": {
        id: "/folder/a.txt",
        position: { x: 400, y: 220 },
        groupId: null,
        zIndex: 1,
      },
    };

    expect(buildFallbackPositions(items, itemLayouts)).toEqual({
      "/folder/b.txt": { x: 0, y: 0 },
    });
  });
});
