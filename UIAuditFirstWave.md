# UI Audit First Wave

## Goal

Implement the first high-impact fixes from the UI audit without changing the renderer data model.

## Modules

- `src/renderer/WorkspaceShell.tsx`
  - Adjust top-level workspace chrome and default new-pile placement.
- `src/renderer/Canvas.tsx`
  - Fix empty-canvas pointer behavior and simplify overlay composition.
- `src/renderer/InspectorPanel.tsx`
  - Add a stable empty-selection guidance state.
- `src/renderer/styles.css`
  - Improve hierarchy, contrast, and keyboard focus visibility.

## Architecture

The first wave stays renderer-only and avoids store or shared type changes. Interaction fixes live in `Canvas.tsx`, selection guidance lives in `InspectorPanel.tsx`, and the visual/a11y improvements are consolidated in `styles.css` so the existing component structure remains intact.

## Data Flow

`WorkspaceShell` renders the workspace chrome and `Canvas`. `Canvas` owns selection state and now consistently feeds the inspector, including the zero-selection state. `InspectorPanel` becomes the persistent guidance/action surface, while CSS changes sharpen distinction between informational status, primary actions, and selected canvas items.

## Verification Plan

- Type-check the renderer changes with `npm run typecheck`.
- Inspect the UI in Storybook or the running app.
- Confirm empty-board click and marquee behavior.
- Confirm visible focus styles while tabbing through controls.
- Confirm the inspector stays visible and informative with nothing selected.

## Implemented Changes

- `Canvas.tsx`
  - Allowed blank-board interactions to start from the visible canvas surface.
  - Removed the floating hint/origin chrome and kept the inspector mounted full-time.
- `InspectorPanel.tsx`
  - Added a zero-selection guidance state instead of disappearing entirely.
- `WorkspaceShell.tsx`
  - Moved the default new-pile spawn point away from the crowded top-left corner.
- `styles.css`
  - Strengthened focus-visible states for buttons, cards, and menu items.
  - Increased card badge/meta readability and better separated status pills from actions.
  - Adjusted overlay layout to keep the right-side inspector as the primary floating chrome.

## Verification Results

- `npm run typecheck`: passed.
- Storybook review: confirmed the empty-selection inspector guidance, cleaner top-left canvas area, and clearer overall UI hierarchy.
