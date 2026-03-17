# Piles Agent Rules

## Authority Order

Use this precedence order when artifacts disagree:

1. `src/shared/types.ts`
2. `src/shared/ipc.ts`
3. `PRD.md`
4. `PLAN.md`
5. `task-manifest.yml`
6. `TODO.md`

If code contracts and docs diverge, update the docs to match the code
contracts immediately.

## Hard Rules

- Do not invent alternate data models.
- Do not reintroduce removed API names.
- Do not bypass preload for privileged renderer actions.
- Do not make grouping mutate files on disk.
- Do not treat workspace persistence as canonical for live filesystem state.

## Canonical Model

Use the split model only:

- `FileMeta` for live filesystem metadata
- `ItemLayout` for persisted visual layout
- `GroupModel` for pile state
- `WorkspaceData` for folder-specific app state

Do not collapse metadata and layout back into one item record.

## Rename Semantics

MVP rename behavior is fixed:

- identity is path-based
- rename is treated as remove/add during reconciliation
- workspace stability is required
- exact identity continuity is not guaranteed

QA should validate survivability, not identity preservation.

## Execution Order

Follow the queue in `TODO.md`.

- Wave 1: scaffold and contracts
- Wave 2: filesystem and persistence
- Wave 3: canvas
- Wave 4: groups
- Wave 5: file actions and sync
- Wave 6: auto-group and QA

Do not start dependent work before upstream contract work is complete.
