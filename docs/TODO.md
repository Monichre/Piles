# Piles Execution TODOs

This queue is derived from:

- [`docs/PRD.md`](./PRD.md)
- [`docs/PLAN.md`](./PLAN.md)
- [`docs/task-manifest.yml`](./task-manifest.yml)

It is intended for `subagent-driven-development`.

## Execution Rules

- Run one implementation task at a time.
- After every implementation task:
  - run spec compliance review first
  - run code quality review second
- Do not start a dependent task until both reviews pass.
- If code contracts are introduced in `src/shared/types.ts` or `src/shared/ipc.ts`,
  they become authoritative and the docs must be updated to match.
- Do not reintroduce alternate models, stale API names, or rename semantics that
  conflict with the normalized docs.

## Assignment Summary

| Task | Owner | Depends On | Outcome |
| --- | --- | --- | --- |
| T-001 | Scaffold Agent | none | App shell and project structure exist |
| T-002 | Scaffold Agent | T-001 | Canonical shared contract files exist |
| T-003 | Scaffold Agent | T-002 | Root `AGENTS.md` and contribution rules exist |
| T-004 | Filesystem Agent | T-002 | Folder selection and folder reads work |
| T-005 | Persistence Agent | T-002 | Workspace load and save work |
| T-006 | Scaffold Agent | T-004, T-005 | Preload and IPC contract wiring is complete |
| T-007 | Canvas Agent | T-006 | Workspace shell and renderer store exist |
| T-008 | Canvas Agent | T-007 | Item render, selection, marquee, drag, persistence work |
| T-009 | Groups Agent | T-008 | Piles render and membership flows work |
| T-010 | Canvas Agent | T-008, T-006 | File action UI wiring works |
| T-011 | Sync Agent | T-009, T-010 | Watch, rescan, and reconcile flow works |
| T-012 | Groups Agent | T-009 | Auto Group works deterministically |
| T-013 | QA Agent | T-011, T-012 | Acceptance and contract review complete |

## Task Packets

### T-001 Scaffold app shell

- Status: complete
- Owner: Scaffold Agent
- Depends on: none
- Source of truth:
  - `PRD.md` product scope
  - `PLAN.md` agent topology and execution order
- Scope:
  - initialize an Electron + React + TypeScript workspace
  - use `src/main`, `src/preload`, `src/renderer`, and `src/shared`
  - create a minimal window that renders successfully
  - keep scaffolding minimal and implementation-friendly
- Deliverables:
  - `package.json`
  - TypeScript configuration
  - Electron entrypoints
  - renderer bootstrap
  - base styles
- Acceptance:
  - app boots without crashing
  - renderer window loads
  - directory structure matches plan
- Out of scope:
  - product logic
  - folder reads
  - persistence

### T-002 Create canonical shared contracts in code

- Status: complete
- Owner: Scaffold Agent
- Depends on: T-001
- Source of truth:
  - `PLAN.md` sections for shared domain contracts and preload API
  - `task-manifest.yml` contract mirror
- Scope:
  - create `src/shared/types.ts`
  - create `src/shared/ipc.ts`
  - export only the normalized `FileMeta`, `Point`, `Size`, `ItemLayout`,
    `GroupModel`, `WorkspaceSettings`, `WorkspaceData`, and `PilesAPI`
  - ensure removed names are not exported anywhere
- Deliverables:
  - `src/shared/types.ts`
  - `src/shared/ipc.ts`
- Acceptance:
  - contract files compile
  - contract names match `PLAN.md`
  - no stale names exist in exported symbols
- Out of scope:
  - implementation of handlers

### T-003 Add project-level agent instructions

- Status: complete
- Owner: Scaffold Agent
- Depends on: T-002
- Source of truth:
  - normalized planning package
- Scope:
  - create a root `AGENTS.md` for this project
  - state that shared code contracts are authoritative over planning docs
  - state that agents must follow wave order and must not invent alternate
    models or API names
- Deliverables:
  - `../AGENTS.md`
- Acceptance:
  - local agent rules exist in repo
  - authority order is explicit
  - rename and model boundaries are explicit

### T-004 Implement filesystem services

- Status: complete
- Owner: Filesystem Agent
- Depends on: T-002
- Source of truth:
  - `PRD.md` workspace, item, file action, and sync behavior
  - `PLAN.md` preload API contract
- Scope:
  - implement folder selection
  - implement direct folder read via `getFolderItems`
  - produce canonical `FileMeta`
  - implement `openFile`, `revealInFinder`, `renameFile`, and `trashFile`
- Deliverables:
  - main-process filesystem service
  - typed IPC handlers or service adapters
- Acceptance:
  - Desktop, Downloads, and custom folder paths are supported
  - only direct folder contents are returned
  - missing files are handled safely
  - file actions map to canonical API names
- Out of scope:
  - renderer UI wiring
  - watch reconciliation

### T-005 Implement persistence services

- Status: complete
- Owner: Persistence Agent
- Depends on: T-002
- Source of truth:
  - `PRD.md` layout persistence behavior
  - `PLAN.md` workspace data contract
- Scope:
  - implement folder-path hashing
  - implement workspace JSON load and save
  - store under app data
  - validate incoming workspace payloads defensively
- Deliverables:
  - persistence module
  - workspace repository helpers
- Acceptance:
  - save and load round-trip works for `WorkspaceData`
  - invalid data fails safely
  - persistence stores layout only, never filesystem truth

### T-006 Wire preload bridge and IPC contract

- Status: complete
- Owner: Scaffold Agent
- Depends on: T-004, T-005
- Source of truth:
  - `src/shared/ipc.ts`
- Scope:
  - expose the canonical `PilesAPI` surface from preload
  - wire IPC channels to filesystem and persistence implementations
  - ensure renderer only reaches privileged actions through preload
- Deliverables:
  - preload bridge
  - IPC registration wiring
- Acceptance:
  - preload API matches `src/shared/ipc.ts`
  - renderer has no direct privileged access
  - folder and workspace APIs are callable end-to-end

### T-007 Build renderer store and workspace shell

- Status: complete
- Owner: Canvas Agent
- Depends on: T-006
- Source of truth:
  - `PRD.md` workspace and canvas sections
  - `PLAN.md` model boundary
- Scope:
  - create renderer store using the split model
  - load folder items and workspace state into store
  - render the workspace shell with clear loading and empty states
- Deliverables:
  - renderer store
  - workspace shell components
- Acceptance:
  - live `FileMeta` and persisted `ItemLayout` are combined only in the
    renderer view layer
  - shell handles initial load, empty folder, and error states

### T-008 Implement item rendering and movement

- Status: complete
- Owner: Canvas Agent
- Depends on: T-007
- Source of truth:
  - `PRD.md` canvas and item behavior
  - `PLAN.md` M3 acceptance
- Scope:
  - render file and folder items on canvas
  - support single-select, multi-select, and marquee
  - implement drag and move
  - persist item positions through the canonical workspace save flow
- Deliverables:
  - item components
  - selection logic
  - drag logic
- Acceptance:
  - items render correctly
  - selection modes work
  - drag updates positions
  - positions restore after reload

### T-009 Implement piles and membership flow

- Status: complete
- Owner: Groups Agent
- Depends on: T-008
- Source of truth:
  - `PRD.md` piles behavior
  - `PLAN.md` M4 acceptance
- Scope:
  - implement pile model usage in renderer
  - create empty pile
  - create pile from selection
  - rename, move, resize, collapse, and delete piles
  - drag items into and out of piles
  - persist pile state
- Deliverables:
  - pile UI
  - group actions
  - membership logic
- Acceptance:
  - pile lifecycle works
  - deleting a pile never deletes files
  - membership and collapsed state restore after reload

### T-010 Wire file actions into the UI

- Status: complete
- Owner: Canvas Agent
- Depends on: T-008, T-006
- Source of truth:
  - `PRD.md` item actions
  - `PLAN.md` M5 acceptance
- Scope:
  - wire double-click open
  - wire reveal, rename, and trash actions from the item UI
  - reflect path-based rename semantics correctly in UI state
- Deliverables:
  - action handlers in renderer
  - item action menu or equivalent UI
- Acceptance:
  - all file actions invoke canonical preload APIs
  - rename flow remains survivable under path-based identity

### T-011 Implement watch, rescan, and reconcile flow

- Status: pending
- Owner: Sync Agent
- Depends on: T-009, T-010
- Source of truth:
  - `PRD.md` filesystem sync behavior
  - `PLAN.md` rename semantics and sync acceptance
- Scope:
  - implement folder watch orchestration
  - rescan on change
  - reconcile live folder contents with persisted workspace data
  - preserve layout for surviving items when possible
  - remove stale layout references safely
- Deliverables:
  - watch service integration
  - reconcile utility
  - renderer subscription flow
- Acceptance:
  - external add appears
  - external delete disappears
  - external move-out disappears
  - external rename is survivable and does not corrupt the workspace
  - watch flow does not spam or leak subscriptions

### T-012 Implement Auto Group

- Status: pending
- Owner: Groups Agent
- Depends on: T-009
- Source of truth:
  - `PRD.md` Auto Group rules
  - `PLAN.md` M7 acceptance
- Scope:
  - implement deterministic grouping rules
  - wire Auto Group into the existing workspace state
  - keep resulting piles and memberships coherent with persistence
- Deliverables:
  - grouping rules
  - Auto Group command wiring
- Acceptance:
  - groups are predictable for the same folder contents
  - no AI inference exists
  - existing data remains coherent after auto-grouping

### T-013 Run final acceptance and contract review

- Status: pending
- Owner: QA Agent
- Depends on: T-011, T-012
- Source of truth:
  - `PRD.md`
  - `PLAN.md`
  - `task-manifest.yml`
- Scope:
  - run the document consistency checks
  - run the product acceptance checklist
  - identify gaps, regressions, and top-priority fixes
- Deliverables:
  - pass or fail report
  - bug list
  - prioritized follow-up tasks
- Acceptance:
  - planning docs and code contracts align
  - no stale API names or model drift remain
  - acceptance results are explicit and actionable

## Review Assignments

Apply the same review pattern to every task:

- Spec compliance reviewer: verifies the task matches `PRD.md`, `PLAN.md`, and
  `task-manifest.yml`
- Code quality reviewer: verifies implementation quality, test coverage, and
  contract safety after spec compliance passes

## Suggested First Dispatch Order

1. T-001
2. T-002
3. T-003
4. T-004
5. T-005
6. T-006
7. T-007
8. T-008
9. T-009
10. T-010
11. T-011
12. T-012
13. T-013
