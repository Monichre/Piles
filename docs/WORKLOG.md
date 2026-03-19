# Piles Work Log

---

## 2026-03-18 — T-009, T-010, docs

**Tasks completed:** T-009 (piles and membership), T-010 (file actions)

### T-009: Implement piles and membership flow

**Commits:** `c887d91`

**What was built:**
- `src/renderer/store.ts` — 5 new Zustand actions: `createGroup`, `deleteGroup`, `updateGroup`, `addItemToGroup`, `removeItemFromGroup`
- `src/renderer/PileCard.tsx` — draggable, resizable, collapsible pile card with inline rename and delete
- `src/renderer/Canvas.tsx` — pile rendering below item layer; drag-drop hit-test assigns group membership atomically
- `src/renderer/WorkspaceShell.tsx` — "New pile" toolbar button
- `src/renderer/pile.test.ts` — 25 tests covering all pile store actions
- `src/renderer/styles.css` — `.pile-card`, `.pile-header`, `.pile-body`, `.pile-resize` (amber palette)

**Key decisions:**
- `deleteGroup` only nullifies `ItemLayout.groupId`; never touches files on disk
- `createGroup` enforces single-group membership by removing seeded items from their prior group before writing the new group
- Pile move/resize uses `canvasEl.getBoundingClientRect() + scrollLeft/scrollTop` (same coordinate math as `toCanvasPoint()` in Canvas)
- `groupId` is written atomically inside `updateItemLayouts` (single Zustand `set()`) — not as a second call from `addItemToGroup` — to avoid a two-render race

**Issues fixed during review:**
- `draftName` not syncing when `group.name` changed externally → `useEffect` on `[group.name, editing]`
- Pile move using raw `clientX/Y` instead of canvas-relative coords → added `canvasEl` prop to `PileCard`
- `CanvasItem.handlePointerDown` inline closure breaking `React.memo` → wrapped in `useCallback`
- `handlePileMove` and `handlePileResize` not persisting → added `void saveWorkspace()` in both

---

### T-010: Wire file actions into the UI

**Commits:** `c25a392`

**What was built:**
- `src/renderer/store.ts` — 4 new actions: `openItem`, `revealItem`, `renameItem`, `trashItem`
- `src/renderer/CanvasItem.tsx` — right-click context menu (Open / Reveal in Finder / Rename… / Move to Trash); inline rename input with keyboard handling
- `src/renderer/PileCard.tsx` — item action callbacks threaded through to `<CanvasItem>` inside pile body
- `src/renderer/Canvas.tsx` — all four action handlers wired to both `<CanvasItem>` and `<PileCard>`
- `src/renderer/store.test.ts` — 17 new tests for `renameItem` and `trashItem`
- `src/renderer/PileCard.stories.tsx` — fixed stale fixtures (removed non-existent fields, added missing callbacks)
- `src/renderer/styles.css` — `.ci-name--editing`, `.ctx-menu`, `.ctx-menu-item`, `.ctx-menu-sep`, `.ctx-menu-item--danger`

**Key decisions:**
- `renameItem` updates three locations atomically in one `set()` call: `items[]`, `itemLayouts` key (path-based identity), `GroupModel.itemIds`; then recomputes `extension` via `lastIndexOf(".")` with `> 0` guard (handles dotfiles)
- `trashItem` removes from all three locations without touching surviving items
- `commitRename` guarded by `renameInFlightRef = useRef(false)` to prevent double-invoke when Enter fires blur
- Context menu uses `position: fixed` with `clientX/Y` (viewport coords) at `zIndex: 99999`

**Issues fixed during review:**
- `renameItem` not updating `FileMeta.extension` after rename → added extension recomputation
- Double `commitRename` on blur-after-Enter → `renameInFlightRef` guard

---

### Docs

- `docs/CONTRIB.md` — added `storybook` and `build-storybook` scripts to table; added Storybook section
- `docs/WORKLOG.md` — created (this file)
- `docs/TODO.md` — T-009 and T-010 marked complete

---

## 2026-03-19 — renderer UI pass, Storybook coverage

**What changed:**
- Reworked the renderer into a more deliberate "studio board" UI, including the shell, toolbar, canvas treatment, file cards, piles, and empty/error states.
- Added `src/renderer/InspectorPanel.tsx` for selection-driven actions, plus `src/renderer/presentation.ts` and `src/renderer/presentation.test.ts` to keep display formatting logic out of the main components.
- Replaced the invalid contents of `src/renderer/components/whiteboard/WhiteBoard.tsx` with a harmless placeholder so typecheck and build stop failing on that file.
- Added Storybook stories for `Canvas`, `CanvasItem`, `InspectorPanel`, and `WorkspaceShell`, along with `src/renderer/storybook-fixtures.ts` to prime the Zustand store for story rendering.
- Updated `.storybook/main.ts` to pre-optimize `zustand`, which fixed the Storybook/Vitest hook and reload issues during validation.

**Validation:**
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run build-storybook`

---

## Current state

- `docs/TODO.md` is complete through `T-013`.
- The follow-up work on 2026-03-19 was polish and Storybook coverage on top of the completed execution queue.
