# UI Audit First Wave Pseudocode

## Scope

- Fix empty-canvas click and marquee behavior.
- Reduce visual crowding in the top-left canvas area.
- Keep the inspector mounted with a helpful empty-selection state.
- Improve focus visibility, action hierarchy, and card readability.

## Pseudocode

### 1. Canvas pointer handling

```text
In Canvas:
  create helper that detects whether pointer started on the blank canvas surface
  allow marquee start when target is the scroll container OR the surface layer
  keep item and pile body interactions stopping propagation as they do now
  preserve existing drag behavior for cards
```

### 2. Stable inspector shell

```text
In Canvas:
  always render InspectorPanel
  pass selected items array even when empty

In InspectorPanel:
  if no selected items:
    show short guidance block
    show keyboard/mouse hints
    do not render destructive or item-specific actions
  else:
    preserve current single-select and multi-select action sets
```

### 3. Reduce chrome collisions

```text
In WorkspaceShell:
  move default new-pile position farther from top-left

In Canvas/styles:
  remove or de-emphasize origin marker
  move guidance emphasis into inspector empty state
  simplify overlay so the first visible board area is cleaner
```

### 4. Visual hierarchy and accessibility

```text
In styles:
  add focus-visible treatments for buttons, pile controls, canvas items, and menu items
  strengthen contrast for file badges and metadata
  visually separate informational pills from actionable buttons
  refine selected and hover states so interactive controls feel intentional
```

### 5. Verification

```text
Run typecheck
Open Storybook or dev UI
Verify:
  clicking blank board clears selection
  dragging blank board starts marquee
  inspector remains visible with no selection
  focus rings appear while tabbing
  new pile no longer collides with top-left chrome
```
