import type { FileMeta } from "../shared/types";

const GENERIC_FILE_BADGE = "FILE";
const DIRECTORY_BADGE = "DIR";
const BADGE_LIMIT = 4;
const MODIFIED_FALLBACK = "Modified date unavailable";

export function getItemBadgeLabel(item: FileMeta): string {
  if (item.kind === "folder" || item.isDirectory) {
    return DIRECTORY_BADGE;
  }

  const extension = item.extension?.trim();
  if (!extension) {
    return GENERIC_FILE_BADGE;
  }

  return extension.toUpperCase().slice(0, BADGE_LIMIT);
}

export function getItemKindLabel(item: FileMeta): string {
  if (item.kind === "folder" || item.isDirectory) {
    return "Folder";
  }

  const badge = getItemBadgeLabel(item);
  return badge === GENERIC_FILE_BADGE ? "File" : `${badge} file`;
}

export function formatModifiedLabel(modifiedAt: string | null): string {
  if (!modifiedAt) {
    return MODIFIED_FALLBACK;
  }

  const date = new Date(modifiedAt);
  if (Number.isNaN(date.getTime())) {
    return MODIFIED_FALLBACK;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `Modified ${formatter.format(date)}`;
}

export function formatSelectionLabel(count: number): string {
  return `${count} item${count === 1 ? "" : "s"} selected`;
}
