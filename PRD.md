# Piles PRD

## 1. Product Definition

Piles is an Electron desktop utility that lets users visually organize the
direct contents of one folder into spatial groups called piles without moving
those files on disk by default.

### Core value

- Reduce cognitive overload in messy folders
- Use spatial memory to make retrieval faster
- Provide reversible organization without filesystem restructuring

## 2. Goals and Non-Goals

### Goals

- Visual canvas for the contents of one folder
- Manual grouping into piles
- Persistent layout state per folder
- Live reflection of external filesystem changes
- Fast, low-friction interaction

### Non-goals

- No filesystem restructuring when grouping
- No cloud sync
- No multi-folder workspaces
- No AI or LLM-based grouping
- No Finder replacement
- No collaboration features
- No tagging system in MVP

## 3. Primary User Flow

1. User opens the app.
2. User chooses Desktop, Downloads, or a custom folder.
3. The app renders the direct contents of that folder as loose items.
4. The user arranges items manually or runs Auto Group.
5. The app persists layout changes automatically.
6. The app reflects later filesystem changes without corrupting the workspace.

## 4. MVP Capabilities

### Workspace

A workspace is the visual representation of one folder.

Requirements:

- Load the direct contents of the chosen folder
- Render files and folders as items
- Persist layout state per folder

### Canvas

Behavior:

- Bounded canvas is acceptable for MVP
- Free placement of items and piles
- Single-select
- Multi-select
- Marquee select
- Drag and drop

Constraints:

- No zoom required in MVP
- Must remain usable with 100 to 200 items

### Items

Each file or folder is represented as one draggable item.

User-visible item data:

- Name
- Kind
- Icon or placeholder representation
- Position on the canvas
- Optional pile membership

Supported actions:

- Open on double-click
- Reveal in Finder
- Rename
- Move to trash

### Piles

A pile is a virtual visual container for items.

Required behavior:

- Create an empty pile
- Create a pile from the current selection
- Rename, move, resize, collapse, and delete a pile
- Drag items into and out of piles
- Preserve membership and collapsed state across reload

Important rule:

- Piles are virtual only and must not move files on disk

### Layout Persistence

Persist:

- Item positions
- Item pile membership
- Pile positions
- Pile sizes
- Pile collapsed state
- Workspace settings

Auto-save on:

- Drag end
- Pile change
- Rename
- Auto-group completion

### Auto Grouping

Auto Group creates deterministic piles based on file type rules.

Initial MVP grouping:

- Images -> Images
- PDFs and documents -> Documents
- DMG and PKG -> Installers
- ZIP and archives -> Archives
- Everything else -> Misc

### File System Sync

The app must reflect external filesystem changes for the active folder.

Expected behavior:

- Added file appears
- Deleted file disappears
- Moved-out file disappears
- Renamed file is survivable, even if identity continuity is not preserved

Implementation shape:

- Watch the active folder
- Trigger a rescan when change events arrive
- Reconcile live folder contents with persisted layout data

## 5. Canonical Product Decisions

### Filesystem truth versus app truth

The filesystem is canonical for:

- File existence
- File names
- File paths
- File metadata

The app is canonical for:

- Item positions
- Pile membership
- Pile geometry
- Collapsed state
- Workspace settings

### Canonical model boundary

Use a split model only:

- `FileMeta` represents live filesystem metadata
- `ItemLayout` represents persisted visual layout
- `GroupModel` represents persisted pile state
- `WorkspaceData` stores groups, item layouts, and settings for one folder

This product document does not define the type signatures directly.
[`PLAN.md`](/Users/liamellis/Desktop/Piles/PLAN.md) is the canonical source for
shared type definitions and preload contract definitions.

### Rename semantics

MVP rename behavior is intentionally limited:

- Item identity is path-based
- A rename is treated as a remove/add event at the identity level
- The workspace must survive the change without corruption
- Exact identity or layout continuity across rename is not guaranteed in MVP

QA should validate survivability, not identity preservation.

## 6. Architecture Summary

High-level architecture:

- Main process
  - Filesystem access
  - Folder watching
  - Persistence
  - OS-level actions
- Renderer
  - Canvas rendering
  - Interaction handling
  - State management
- Shared domain
  - Types
  - DTOs
  - Pure utilities

Recommended stack:

- Electron
- React
- TypeScript
- Zustand
- JSON persistence
- IPC between main and renderer

## 7. Constraints and Quality Bars

- Use DOM-based rendering for MVP
- Prefer pointer events over heavy drag libraries
- Avoid broad or speculative abstractions
- Keep grouping deterministic
- Avoid hidden privileged behavior in the renderer
- Keep the product simple enough that agents cannot invent adjacent features

## 8. Success Criteria

The MVP is successful if a user can:

- Open Desktop, Downloads, or a custom folder
- See direct folder contents rendered as items
- Move items on the canvas
- Create and manage piles
- Reload the app and retain layout state
- Perform file actions through the UI
- Observe external folder changes reflected safely
- Run Auto Group and get predictable results

## 9. Kill Criteria

Kill or pivot if:

- Piles do not meaningfully reduce clutter
- Users return to Finder because the workflow is slower
- Layout becomes chaotic after moderate use
- Folder sync destabilizes the workspace

## 10. Document Authority

- [`PRD.md`](/Users/liamellis/Desktop/Piles/PRD.md) is the canonical product
  behavior document.
- [`PLAN.md`](/Users/liamellis/Desktop/Piles/PLAN.md) is the canonical
  implementation and orchestration document.
- [`task-manifest.yml`](/Users/liamellis/Desktop/Piles/task-manifest.yml) is the
  machine-readable mirror of the canonical implementation plan.
