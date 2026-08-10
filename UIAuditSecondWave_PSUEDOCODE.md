# UI Audit Second Wave Pseudocode

## Scope

- Make pile drop targets visible while dragging cards.
- Improve keyboard activation on file cards.

## Pseudocode

### 1. Drag-over pile highlight

```text
In Canvas:
  add hoverDropGroupId state
  when drag is active on pointer move:
    compute current pointer point
    hit test piles
    store hovered pile id
  on drop and on cancel:
    clear hovered pile id
  pass isDropTarget to each PileCard

In PileCard:
  accept isDropTarget prop
  add modifier class when true

In styles:
  create stronger border, shadow, and background cue for drop-target pile
```

### 2. Keyboard activation for cards

```text
In CanvasItem:
  add keydown handler for focused card
  Enter or Space:
    prevent default
    trigger open behavior
  ContextMenu key or Shift+F10:
    open context menu near card
  expose selected state with aria-pressed
```

### 3. Verification

```text
Run typecheck
In Storybook:
  drag a card over a pile and confirm visible target feedback
  focus a card and activate it with Enter/Space
  confirm no regression in pointer drag or context menu behavior
```
