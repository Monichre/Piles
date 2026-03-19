import { describe, expect, it } from "vitest";

import type { FileMeta } from "../shared/types";

import {
  formatModifiedLabel,
  formatSelectionLabel,
  getItemBadgeLabel,
  getItemKindLabel,
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
