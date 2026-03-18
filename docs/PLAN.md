# Piles Implementation Plan

## 1. Purpose

This document is the canonical implementation and orchestration reference for
Piles.

It defines:

- Shared domain contracts
- Preload API contracts
- Canonical execution order
- Agent responsibilities
- Acceptance and consistency checks

Document ownership:

- [`docs/PRD.md`](./PRD.md) owns product behavior and
  scope
- [`docs/PLAN.md`](./PLAN.md) owns implementation
  contracts and sequencing
- [`docs/task-manifest.yml`](./task-manifest.yml) is the
  machine-readable mirror of this plan

If future code files such as `shared/types.ts` or preload API type definitions
are introduced, those typed contracts become authoritative and this document
must be updated to match them immediately.

## 2. Canonical Decisions

### Filesystem truth versus app truth

The filesystem is canonical for:

- File existence
- File paths
- File names
- File metadata

The app is canonical for:

- Item positions
- Pile membership
- Pile geometry
- Collapsed state
- Workspace settings

### Rename semantics

MVP rename behavior is fixed as follows:

- Item identity is path-based
- Rename is treated as a remove/add event at the identity level
- Workspace reconciliation must remain stable and non-corrupt
- Exact identity continuity for renamed items is not guaranteed

### Model boundary

Use one model only:

- `FileMeta` for live folder metadata
- `ItemLayout` for persisted visual layout
- `GroupModel` for persisted pile state
- `WorkspaceData` for folder-specific app state

Do not reintroduce the combined item-plus-layout workspace model.

## 3. Shared Domain Contracts

```ts
export type FileMeta = {
  id: string; // same as path for MVP
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
  id: string; // file path in MVP
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
```

## 4. Preload API Contract

Use this contract and remove any older names.

```ts
export interface PilesAPI {
  selectFolder: () => Promise<string | null>;
  getFolderItems: (folderPath: string) => Promise<FileMeta[]>;
  loadWorkspace: (folderPath: string) => Promise<WorkspaceData | null>;
  saveWorkspace: (workspace: WorkspaceData) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  revealInFinder: (path: string) => Promise<void>;
  renameFile: (path: string, newName: string) => Promise<{ newPath: string }>;
  trashFile: (path: string) => Promise<void>;
  watchFolder: (folderPath: string) => Promise<void>;
  unwatchFolder: () => Promise<void>;
  onFolderChanged: (callback: () => void) => () => void;
}
```

Only the names listed above are valid.

## 5. Agent Topology

### Manager Agent

Responsibilities:

- Freeze shared contracts before downstream implementation starts
- Enforce the PRD scope and non-goals
- Assign work by phase
- Review handoffs for contract drift
- Reject speculative scope expansion

### Scaffold Agent

Responsibilities:

- Establish project structure
- Set up main, preload, renderer, and shared boundaries
- Publish the first canonical contract placeholders

### Filesystem Agent

Responsibilities:

- Folder selection
- Direct folder read
- File metadata creation
- Open, reveal, rename, and trash actions
- Folder watcher support in the main process

### Persistence Agent

Responsibilities:

- Workspace load and save
- Folder-path hashing
- JSON storage under app data
- Defensive validation and fallback behavior

### Canvas Agent

Responsibilities:

- Renderer store
- Workspace shell
- Item rendering
- Selection and marquee behavior
- Drag and move behavior
- Wiring to persistence and later group/sync integration points

### Groups Agent

Responsibilities:

- Create, render, and manage piles
- Membership updates
- Collapse, delete, resize, and rename behavior
- Deterministic auto-group rules

### Sync Agent

Responsibilities:

- Watch flow orchestration
- Rescan and reconcile behavior
- Preserving layout state for surviving items
- Safe cleanup of stale layout entries

### QA Agent

Responsibilities:

- PRD conformance review
- Contract consistency review
- Manual acceptance pass
- Regression and defect reporting

## 6. Execution Order

Shared contracts are frozen in Wave 1. Later waves may consume them but may not
change them without manager approval.

### Wave 1: Scaffold and contracts

Primary agents:

- Manager
- Scaffold

Deliverables:

- Agreed project structure
- Canonical shared contract definitions
- Canonical preload API contract
- Machine-readable manifest shape

### Wave 2: Filesystem and persistence

Primary agents:

- Filesystem
- Persistence

Deliverables:

- Folder read and folder selection
- Workspace load and save
- Main-process file actions

### Wave 3: Canvas

Primary agents:

- Canvas

Deliverables:

- Renderer store
- Workspace shell
- Item rendering
- Selection, marquee, and move behavior
- Position persistence wiring

### Wave 4: Groups

Primary agents:

- Groups
- Canvas

Deliverables:

- Pile rendering
- Group creation and management
- Drag items into and out of piles
- Persisted pile state

### Wave 5: File actions and sync

Primary agents:

- Filesystem
- Canvas
- Sync

Deliverables:

- Double-click open
- Context actions for reveal, rename, and trash
- Watch, rescan, and reconcile flow
- Stable handling of external add, delete, move-out, and rename

### Wave 6: Auto-group and QA

Primary agents:

- Groups
- Canvas
- QA

Deliverables:

- Deterministic auto-group behavior
- Empty, loading, and error states
- Final acceptance and contract review

## 7. Milestone Breakdown

### M1. Bootstrap and contracts

Goal:

- The package has one canonical contract set and one agreed structure.

Primary owners:

- Manager
- Scaffold

Acceptance:

- Shared contracts are defined once
- Preload API names are frozen
- No downstream task depends on undefined interfaces

### M2. Folder load and workspace persistence

Goal:

- A folder can be selected, its direct contents can be read, and workspace state
  can be loaded or saved.

Primary owners:

- Filesystem
- Persistence

Acceptance:

- Desktop loads
- Downloads loads
- Custom folder loads
- Workspace JSON load and save work

### M3. Canvas render and item movement

Goal:

- Users can render, select, move, and persist loose items.

Primary owners:

- Canvas

Acceptance:

- Items render
- Single-select works
- Multi-select works
- Marquee select works
- Drag and move works
- Positions restore after reload

### M4. Piles

Goal:

- Users can create and manage virtual piles.

Primary owners:

- Groups
- Canvas

Acceptance:

- Empty pile works
- Create pile from selection works
- Rename pile works
- Move and resize pile work
- Collapse works
- Delete pile preserves files
- Drag into and out of piles works

### M5. File actions

Goal:

- Users can act on files through the workspace UI.

Primary owners:

- Filesystem
- Canvas

Acceptance:

- Double-click opens file
- Reveal in Finder works
- Rename is survivable under path-based identity semantics
- Trash works

### M6. Sync

Goal:

- The workspace safely reflects external filesystem changes.

Primary owners:

- Sync
- Filesystem
- Canvas

Acceptance:

- External add appears
- External delete disappears
- External move-out disappears
- External rename is survivable and does not corrupt the workspace

### M7. Auto-group

Goal:

- Users can create deterministic piles from current folder contents.

Primary owners:

- Groups
- Canvas

Acceptance:

- Auto Group creates predictable piles
- Existing workspace data remains coherent
- Empty, loading, and error states remain sane

### M8. QA

Goal:

- The build passes product and contract review for the MVP package.

Primary owners:

- QA
- Manager

Acceptance:

- PRD and implementation plan are aligned
- Manifest mirrors the plan
- Acceptance checklist and defect list exist

## 8. Consistency and Acceptance Checks

### Document consistency checks

- `docs/task-manifest.yml` parses as YAML
- Contract names match across planning artifacts
- Rename policy is stated once and stated consistently
- The split model is used everywhere
- No document reintroduces removed API names

### Product acceptance checklist

Launch and folder:

- App launches successfully
- Desktop opens
- Downloads opens
- Custom folder opens

Item rendering and movement:

- Files render as items
- Folders render as items
- Click selects one item
- Multi-select works
- Marquee select works
- Drag and move work
- Relative spacing is preserved during multi-drag

Piles:

- Create pile works
- Empty pile works
- Rename pile works
- Move pile works
- Resize pile works
- Collapse pile works
- Delete pile preserves files
- Drag into pile works
- Drag out of pile works

Persistence:

- Item positions restore
- Pile state restores
- Collapsed state restores

File actions:

- Open works
- Reveal in Finder works
- Rename is survivable
- Trash works

Sync:

- External add appears
- External delete disappears
- External rename does not corrupt the workspace
- Watch flow does not spam or leak subscriptions

Contract safety:

- Renderer does not bypass preload for privileged actions
- Grouping never mutates the filesystem
- Workspace state never becomes the source of truth for live files

## 9. Manager Dispatch Template

Use this for every work packet.

```md
# Milestone
<name>

## Goal
<what must be true when the milestone is complete>

## Dependencies
- <dependency>
- <dependency>

## Assigned agents
- <agent>: <responsibility>
- <agent>: <responsibility>

## Shared contracts
- <types, events, or API names that are frozen>

## Acceptance criteria
- [ ] <criterion>
- [ ] <criterion>

## Risks
- <risk>
- <risk>

## Required delivery format
1. Summary of work completed
2. Files created or edited
3. Interfaces exported or consumed
4. Assumptions
5. Edge cases handled
6. Known limitations
```

## 10. Agent Handoff Template

```md
## Task
<task name>

## Completed
<what was done>

## Files changed
- path/to/file

## Public interfaces
- function/type/event

## Assumptions
- ...

## Edge cases handled
- ...

## Known limitations
- ...
```
