# PRDCanvasWhiteboardUILayer

## Objective
Define a "canvas + whiteboard" UI layer over the active macOS folder that supports reversible spatial organization:
- Users can freely move item cards and manage virtual piles without mutating filesystem structure (except via explicit item actions like open/reveal/rename/trash).
- Visual state (item positions, pile membership, pile geometry, collapsed state) is persisted per folder and restored on reload.

## Key UI Modules (Component-Level)
- `CanvasShell`
  - Owns bounded canvas container, top bar, and the minimal context-driven side inspector.
  - Orchestrates selection summary and primary actions (including `Auto Group` entry point if enabled).
- `CanvasBoard`
  - Renders the whiteboard background (paper/grid) and hosts absolutely-positioned item/pile surfaces inside bounds.
  - Provides the drag/marquee interaction surface and drop target highlight logic.
- `ItemCard`
  - Displays file/folder icon/placeholder + name + kind indicator.
  - Visual states: default, hover, selected (persistent), dragging.
  - Emits interaction events: select, start drag, end drag, request rename, request open, request trash/reveal.
- `PileContainer`
  - Renders pile header (name + collapse chevron) and optional resize handle.
  - Manages internal presentation for collapsed vs expanded mode (items remain members; contents may be hidden).
  - Emits interaction events: move pile (header drag), resize pile, toggle collapse, rename pile.
- `InspectorPanel`
  - Minimal panel that appears on selection.
  - Exposes the same actions as the item/pile context menus to avoid divergent logic paths.
  - Provides "Create pile from selection" when selection is non-empty.
- `EmptyStatePanel`, `LoadingSkeleton`, `ErrorBanner`
  - Must be non-destructive to persisted layout state (errors never corrupt stored layout).

## Interaction Model (User Intent -> UI State)
- Pointer primary:
  - Click selects items; multi-select and marquee selection apply as already defined in MVP.
  - Drag-and-drop updates item positions (loose placement) and pile membership when dropped over a pile.
- Pile controls:
  - Move pile by dragging the pile header region.
  - Resize pile via bottom-right handle and persist the resulting geometry.
  - Collapse/expand via chevron; collapsed state must be immediate and persistent.
- Item controls:
  - Double-click opens via existing file-action behavior.
  - Rename supports inline rename without layout jitter.
  - Context menu and inspector must call the same underlying actions.

## State and Data Flow (To Persisted Layout Fields)
Persisted visual fields (`WorkspaceData`) map directly to what the canvas renders:
- `ItemLayout.position` -> item card coordinates within the bounded canvas.
- `ItemLayout.groupId` -> determines loose placement vs pile membership rendering.
- `GroupModel.position` + `GroupModel.size` -> pile container geometry on the board.
- `GroupModel.collapsed` -> pile header-only vs expanded rendering.
- `WorkspaceSettings` (e.g., `snapToGrid`) -> affects how dragging/movement is quantized (if enabled).

Update cadence (from PRD `Auto-save on`):
- On drag end -> persist updated `ItemLayout.position` (and membership if the drag ended over a pile).
- On pile change -> persist `GroupModel.position/size/collapsed`.
- On rename -> persist the relevant item/pile layout state if UI requires it; filesystem rename is handled by file actions.

## Rendering/Performance Constraints
- No zoom required for MVP: keep positioning math simple and stable.
- Designed for 100-200 items:
  - Use lightweight absolute positioning and throttle pointer-move updates (e.g., `requestAnimationFrame`).
  - Avoid heavy effects during drag; memoize card components to prevent re-render storms.

