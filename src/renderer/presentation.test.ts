import { describe, expect, it } from "vitest";

import type { FileMeta } from "../shared/types";

import {
  formatModifiedLabel,
  formatSelectionLabel,
  getItemBadgeLabel,
  getItemCategoryLabel,
  getItemKindLabel,
  getItemTone,
} from "./presentation";

function buildItem(overrides: Partial<FileMeta>): FileMeta {
  return {
    id: "/tmp/example",
    path: "/tmp/example",
    name: "example",
    extension: null,
    isDirectory: false,
    kind: "file",
    createdAt: null,
    modifiedAt: null,
    ...overrides,
  };
}

describe("presentation helpers", () => {
  it("returns a stable directory badge for folders", () => {
    expect(
      getItemBadgeLabel(
        buildItem({
          kind: "folder",
          isDirectory: true,
          extension: null,
        })
      )
    ).toBe("DIR");
  });

  it("uppercases and truncates file extensions for badges", () => {
    expect(
      getItemBadgeLabel(
        buildItem({
          extension: "sketch",
        })
      )
    ).toBe("SKET");
  });

  it("falls back to a generic label for extensionless files", () => {
    expect(getItemKindLabel(buildItem({ extension: null }))).toBe("File");
  });

  it("formats valid modified timestamps into a short human label", () => {
    expect(formatModifiedLabel("2026-03-19T09:30:00.000Z")).toBe(
      "Modified Mar 19, 2026"
    );
  });

  it("returns a safe fallback for invalid timestamps", () => {
    expect(formatModifiedLabel("not-a-date")).toBe(
      "Modified date unavailable"
    );
  });

  it("formats selection counts with correct singular and plural labels", () => {
    expect(formatSelectionLabel(1)).toBe("1 item selected");
    expect(formatSelectionLabel(4)).toBe("4 items selected");
  });
});

describe("getItemTone", () => {
  it("classifies documents as green", () => {
    expect(getItemTone(buildItem({ extension: "pdf" }))).toBe("green");
    expect(getItemTone(buildItem({ extension: "md" }))).toBe("green");
  });

  it("classifies media as yellow", () => {
    expect(getItemTone(buildItem({ extension: "png" }))).toBe("yellow");
    expect(getItemTone(buildItem({ extension: "mp4" }))).toBe("yellow");
  });

  it("classifies code as red", () => {
    expect(getItemTone(buildItem({ extension: "ts" }))).toBe("red");
    expect(getItemTone(buildItem({ extension: "json" }))).toBe("red");
  });

  it("falls back to plain for unknown extensions", () => {
    expect(getItemTone(buildItem({ extension: "sketch" }))).toBe("plain");
  });

  it("falls back to plain for extensionless files", () => {
    expect(getItemTone(buildItem({ extension: null }))).toBe("plain");
  });

  it("strips a leading dot and ignores case on the extension", () => {
    expect(getItemTone(buildItem({ extension: ".PNG" }))).toBe("yellow");
  });

  it("classifies folders as plain regardless of extension", () => {
    expect(
      getItemTone(buildItem({ kind: "folder", isDirectory: true, extension: "png" }))
    ).toBe("plain");
  });
});

describe("getItemCategoryLabel", () => {
  it("returns human-readable category matching the filter pill labels", () => {
    expect(getItemCategoryLabel(buildItem({ extension: "pdf" }))).toBe("Document");
    expect(getItemCategoryLabel(buildItem({ extension: "png" }))).toBe("Media");
    expect(getItemCategoryLabel(buildItem({ extension: "ts" }))).toBe("Code");
    expect(getItemCategoryLabel(buildItem({ extension: "sketch" }))).toBe("File");
  });

  it("returns Folder for directories", () => {
    expect(
      getItemCategoryLabel(buildItem({ kind: "folder", isDirectory: true }))
    ).toBe("Folder");
  });
});
