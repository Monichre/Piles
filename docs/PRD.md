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

#### Visual and Interaction Philosophy
The canvas should feel like a "reversible workspace" layered over the macOS filesystem:
- Show organization as visual geometry (cards + piles) that users can change freely without destructive consequences.
- Prefer "undo-able" actions: moving items, resizing piles, collapsing piles, and dragging membership should all be reversible by direct manipulation.
- Keep the workspace readable under moderate density (100-200 items): hierarchy is via spacing, borders, and subtle emphasis - not heavy effects.
- Make state legible: selection, hover, drag-over pile targets, and drop results must be visually explicit and consistent.

#### Recommended UI Layout (Minimal)
- Top bar (static, always visible)
  - Active folder indicator (workspace name/path)
  - Primary actions: `Auto Group` (if implemented) and minimal workspace controls (e.g. "Snap to grid" if enabled by settings)
  - Selection summary (single item / N selected) to reduce ambiguity during multi-select.
- Main canvas (bounded whiteboard)
  - Fixed-size or resizable bounded region (no zoom required)
  - Grid/paper background for orientation and alignment
  - Items rendered as absolutely-positioned cards inside the bounds
  - Piles rendered as bounded containers with headers and resize affordances
- Side inspector (minimal, context-driven)
  - Appears only when selection exists (or shows a help/empty panel when none)
  - Shows current selection (item(s) and/or pile) and exposes the same actions available elsewhere:
    - Item: rename, reveal in Finder, trash
    - Pile: rename, collapse/expand, delete
  - Includes "Create pile from selection" when selection is non-empty
- Pile handles (inside piles, not separate UI)
  - Header bar for collapse/expand and rename
  - Resize handle for pile geometry

#### Canvas Styling (Simple, Beautiful, Low-Cost)
Whiteboard background:
- Use a subtle paper texture illusion with CSS-only techniques (e.g., low-opacity gradients) and an optional grid overlay (via `repeating-linear-gradient`), both at very low opacity.
- The bounded canvas should have:
  - A neutral border and rounded corners
  - No heavy drop shadows (keep it lightweight for 100-200 items)
Items (cards):
- Card shape: rounded rectangle with a thin border; background slightly elevated from the whiteboard.
- Card content:
  - Left icon/placeholder
  - File/folder name (single line, truncated with ellipsis)
  - Kind badge (optional, subtle) or small dot indicator
- Visual emphasis states (must be distinct):
  - Default: neutral border
  - Hover: slight border darkening and/or minimal elevation (no large shadow animation)
  - Selected: high-contrast outline + focus ring style
  - Dragging: keep visual identity (same card styling); reduce "paper noise" effects during drag if needed (performance)
Piles (containers):
- Pile background tint: very subtle (transparent fill) so the whiteboard remains visible.
- Pile border:
  - Normal: thin border
  - Active drop target (when dragging items over): stronger border + dashed outline
- Pile header:
  - Header bar with name and collapse affordance (chevron)
  - Header region is the primary drag handle for moving the pile

Selection/hover/drag consistency:
- Selection should never depend on hover to be visible.
- Drag-over pile targets must be clearly highlighted before drop.

#### Performance and Rendering Considerations (100-200 items)
The UI must remain responsive with 100-200 items and frequent pointer movement (drag/marquee):
- Prefer DOM-based rendering with lightweight absolute positioning within the bounded canvas.
- During drag:
  - Throttle high-frequency pointer move updates (e.g., `requestAnimationFrame`).
  - Use CSS transforms for movement where possible to avoid layout thrash.
  - Avoid per-frame re-computation of expensive effects.
- Background grid/paper should be a single canvas background (CSS gradients), not many repeated elements.
- Avoid heavy visual effects (blur filters, large shadows, animated textures) while dragging.
- Memoize item/pile card components so unchanged cards do not re-render on every pointer move.
- No zoom required: interaction math stays simple and predictable.

#### Empty, Loading, and Error States
- Empty folder:
  - Show a lightweight empty-state panel inside the bounded canvas (centered or top-left) explaining that the user is looking at an empty folder and offering `Auto Group` / "Create pile" entry points.
- Loading (initial folder read and workspace load):
  - Keep the whiteboard visible while showing skeleton cards/placeholder items (or a single "Loading..." indicator) so layout doesn't jump.
- Sync/rescan in progress (external filesystem changes):
  - Use a non-blocking, subtle status indicator (e.g., "Refreshing...") without clearing the existing canvas immediately.
  - If items are reconciled safely, preserve what can be preserved; if not, fail gracefully (see error states).
- Error states:
  - Show an inline banner within the canvas explaining what failed (e.g., "Could not read folder") and provide a single retry action.
  - Errors must never corrupt persisted workspace layout state; the UI should remain able to load the last persisted layout snapshot.

#### Accessibility Requirements (Simple + Practical)
- Focus visibility:
  - Item and pile headers must show a clear focus ring when navigated via keyboard focus.
  - Selected items must remain visually distinguishable without relying on hover.
- Keyboard parity (MVP-essential):
  - The existing `Enter` (open), `F2` (rename), and `Delete` (trash) shortcuts must work on the current selection (even if focus is on the card).
  - Full keyboard canvas navigation (arrow-key positioning, grid traversal) is not required for MVP.
- Contrast and readability:
  - Text and selection outlines must meet readable contrast on the whiteboard background (avoid low-contrast "paper" styling for labels).
- Reduced motion:
  - Avoid animated textures/flashy transitions; any non-essential motion should respect `prefers-reduced-motion`.

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

#### Item UI and Interaction Details
Item card interactions:
- Selection:
  - Single click selects one item.
  - Multi-select uses existing MVP mechanics (multi-select + marquee select).
  - Selection must be visually persistent even when not hovering.
- Drag and drop:
  - Dragging a selected item moves it (and should support moving multiple selected items as a group).
  - When dragging over a pile container, show the pile as a drop target; on drop, update membership.
  - Dropping outside any pile restores loose placement (membership becomes null).
Item actions:
- Open on double-click:
  - Double-click opens the item (file/folder) via existing Wave 5 file-action behavior.
- Rename affordance:
  - Primary path is via context menu or side inspector (consistent with MVP file actions).
  - Inline rename UI: when renaming, replace the name text in the card with an input, auto-select text, and commit on Enter / cancel on Escape.
  - Rename UI must preserve card layout (no large resizing).
- Reveal in Finder:
  - Provided via context menu and side inspector for the selected item(s).
- Trash:
  - Provided via context menu and side inspector for the selected item(s).
Context menu behavior:
- Context menu appears via:
  - Right-click / secondary click on an item card
  - Ctrl-click (macOS parity)
- Context menu contains only the relevant actions for the current selection state (single vs multi).
- Side inspector and context menu must use the same underlying actions (no divergent logic paths).

Keyboard shortcuts (keep minimal; only essential parity):
- `Enter`: open selected item (when a single item is selected)
- `F2`: rename selected item
- `Delete` or `Backspace`: trash selected item(s)
- `Escape`: clear selection or cancel rename
(If full keyboard canvas navigation is not implemented in MVP, document that mouse/pointer is the primary canvas interaction mode.)

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

#### Pile UI and Interaction Details
Pile appearance:
- A pile is a visible bounded container on the whiteboard.
- Each pile has a header bar with:
  - Pile name
  - Collapse/expand chevron affordance
  - Subtle hover feedback to indicate it is draggable
- Collapsed piles:
  - Show header only
  - Keep pile geometry "collapsed state" persisted as the persisted collapsed flag (items remain members, just hidden by collapse)
  - Provide an obvious way to expand again (header chevron)
Pile creation:
- Create an empty pile:
  - Available via side inspector and/or top bar minimal control.
  - Newly created pile should appear at a sensible default position within canvas bounds (and must not require user zooming to find it).
- Create a pile from current selection:
  - Available via side inspector when selection is non-empty.
  - Initial pile geometry should be derived from selected items' bounds with padding, constrained to the bounded canvas.
Pile movement and resize:
- Moving a pile:
  - Drag the pile header to move the pile.
- Resizing a pile:
  - Use a bottom-right resize handle (cursor changes to resize).
  - Resizing should update persisted pile size geometry.
  - While resizing, keep the pile header readable and avoid distracting animations.
- Collapse header affordance:
  - The collapse chevron is the only required collapse control (simple and discoverable).
  - The collapsed state must be reflected immediately and persist across reload.
Drag/drop into piles:
- Drag items over a pile:
  - Pile shows an active drop highlight (solid or dashed stronger border).
- Drop result:
  - Items become members of the pile and follow the membership rule on reload (collapsed state respected).
- Drag items out of piles:
  - Dropping outside any pile (still within bounded canvas) removes membership (returns to loose placement).
- Multi-item drag into/out of piles:
  - Dragging multiple selected items over a pile adds all of them to the pile.
  - Dropping a mixed selection should apply membership for each item based on drop location (pile vs loose).

### Layout Persistence

Persist:

- Item positions
- Item pile membership
- Pile positions
- Pile sizes
- Pile collapsed state
- Workspace settings

Visual persistence mapping:
- Every UI state described above that affects what the user sees on the canvas must correspond directly to a persisted field:
  - Item positions and membership drive what appears where.
  - Pile positions/sizes drive the container geometry.
  - Pile collapsed state drives whether pile contents are shown/hidden.

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

#### Design-to-Implementation Mapping (PRD sections + Wave order)
- Canvas UI Layer (whiteboard background, bounded region, card visuals, selection/hover/drag state):
  - Lives in `### Canvas` and maps to Wave 3 "Canvas" deliverables (rendering, selection, marquee, item movement).
- Pile UI interactions (create empty pile, create from selection, header collapse, resize handle, drag/drop membership):
  - Lives in `### Piles` and maps to Wave 4 "Groups" deliverables (pile rendering, pile management, drag items into/out of piles, persisted pile state).
- Item interactions (double-click open, context menu actions, rename affordance, reveal/trash):
  - Lives in `### Items` and maps to Wave 5 "File actions and sync" deliverables (double-click open and context actions).
- Layout Persistence:
  - Lives in `### Layout Persistence` and maps to persistence wiring done in Waves 3-5, with QA reinforcement in Wave 6.
- Empty/loading/error states:
  - Should be included by Wave 6 "Auto-group and QA" so the UX remains sane during folder scanning, reconciliation, and final acceptance.

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
[`docs/PLAN.md`](./PLAN.md) is the canonical source for
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

- [`docs/PRD.md`](./PRD.md) is the canonical product
  behavior document.
- [`docs/PLAN.md`](./PLAN.md) is the canonical
  implementation and orchestration document.
- [`docs/task-manifest.yml`](./task-manifest.yml) is the
  machine-readable mirror of the canonical implementation plan.
