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

// ---------------------------------------------------------------------------
// Document tones
//
// A semantic category ramp carried over from the canvas mockups: a card's fill
// tells you what kind of thing it is before you read its name. This is
// classification, not decoration — the same role syntax highlighting plays —
// which is why it is exempt from the accent budget.
//
// Purely presentational. Nothing here touches FileMeta or the filesystem.
// ---------------------------------------------------------------------------

export type ItemTone = "green" | "yellow" | "red" | "plain";

const TONE_BY_EXTENSION: Record<string, ItemTone> = {
  // Documents and prose
  md: "green",
  markdown: "green",
  txt: "green",
  rtf: "green",
  pdf: "green",
  doc: "green",
  docx: "green",
  pages: "green",
  // Images, audio, video
  png: "yellow",
  jpg: "yellow",
  jpeg: "yellow",
  gif: "yellow",
  svg: "yellow",
  webp: "yellow",
  heic: "yellow",
  avif: "yellow",
  mp4: "yellow",
  mov: "yellow",
  webm: "yellow",
  mp3: "yellow",
  wav: "yellow",
  aiff: "yellow",
  // Code, config, structured data
  ts: "red",
  tsx: "red",
  js: "red",
  jsx: "red",
  json: "red",
  py: "red",
  rb: "red",
  go: "red",
  rs: "red",
  java: "red",
  swift: "red",
  sh: "red",
  css: "red",
  scss: "red",
  html: "red",
  yml: "red",
  yaml: "red",
  toml: "red",
  sql: "red",
  csv: "red",
};

export function getItemTone(item: FileMeta): ItemTone {
  if (item.kind === "folder" || item.isDirectory) {
    return "plain";
  }

  const extension = item.extension?.trim().replace(/^\./, "").toLowerCase();
  if (!extension) {
    return "plain";
  }

  return TONE_BY_EXTENSION[extension] ?? "plain";
}

const TONE_DESCRIPTION: Record<ItemTone, string> = {
  green: "Document",
  yellow: "Media",
  red: "Code",
  plain: "File",
};

/** Human-readable category, for the inspector and screen readers. */
export function getItemCategoryLabel(item: FileMeta): string {
  if (item.kind === "folder" || item.isDirectory) {
    return "Folder";
  }
  return TONE_DESCRIPTION[getItemTone(item)];
}

// ---------------------------------------------------------------------------
// Visual kind
//
// A granular file-type classification that drives the card's visual structure.
// Where ItemTone has four categories for the filter system, ItemVisualKind has
// eight for the card layout: each kind renders as a different physical
// artifact on the desk. A PDF looks like a dog-eared page, a PNG looks like a
// polaroid, a folder looks like a manila folder, code looks like an index
// card with a colored stripe.
//
// Purely presentational. Nothing here touches FileMeta or the filesystem.
// ---------------------------------------------------------------------------

export type ItemVisualKind =
  | "folder"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive"
  | "other";

const VISUAL_KIND_BY_EXTENSION: Record<string, ItemVisualKind> = {
  // Images
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "image",
  webp: "image",
  heic: "image",
  avif: "image",
  // Video
  mp4: "video",
  mov: "video",
  webm: "video",
  avi: "video",
  mkv: "video",
  // Audio
  mp3: "audio",
  wav: "audio",
  aiff: "audio",
  flac: "audio",
  ogg: "audio",
  m4a: "audio",
  // Documents
  md: "document",
  markdown: "document",
  txt: "document",
  rtf: "document",
  pdf: "document",
  doc: "document",
  docx: "document",
  pages: "document",
  // Code
  ts: "code",
  tsx: "code",
  js: "code",
  jsx: "code",
  json: "code",
  py: "code",
  rb: "code",
  go: "code",
  rs: "code",
  java: "code",
  swift: "code",
  sh: "code",
  css: "code",
  scss: "code",
  html: "code",
  yml: "code",
  yaml: "code",
  toml: "code",
  sql: "code",
  csv: "code",
  xml: "code",
  // Archives
  zip: "archive",
  tar: "archive",
  gz: "archive",
  rar: "archive",
  "7z": "archive",
  dmg: "archive",
  iso: "archive",
};

export function getItemVisualKind(item: FileMeta): ItemVisualKind {
  if (item.kind === "folder" || item.isDirectory) {
    return "folder";
  }

  const extension = item.extension?.trim().replace(/^\./, "").toLowerCase();
  if (!extension) {
    return "other";
  }

  return VISUAL_KIND_BY_EXTENSION[extension] ?? "other";
}

const VISUAL_KIND_LABEL: Record<ItemVisualKind, string> = {
  folder: "Folder",
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  code: "Code",
  archive: "Archive",
  other: "File",
};

/** Human-readable kind label for screen readers and the inspector. */
export function getItemVisualKindLabel(item: FileMeta): string {
  return VISUAL_KIND_LABEL[getItemVisualKind(item)];
}
