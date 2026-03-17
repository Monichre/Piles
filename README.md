# Piles

Piles is an Electron desktop utility for visually organizing the direct
contents of a single folder into spatial groups called piles without moving the
underlying files on disk by default.

## Current Status

This repository is in active prototype development.

Implemented now:

- Electron + React + TypeScript app scaffold
- Canonical shared contracts in code
- Preload bridge and IPC registration
- Filesystem service for folder selection, folder reads, and file actions
- Persistence service for workspace load and save
- Initial renderer shell

Next planned work:

- Renderer store and workspace loading
- Item rendering, selection, marquee, and drag behavior
- Piles and membership flows
- Folder watch, reconcile, and auto-group behavior

## Product Constraints

- Single-folder workspace only
- Piles are virtual in MVP
- Filesystem is the source of truth for live files
- No AI grouping
- No cloud sync
- No Finder replacement
- No hidden filesystem mutations

## Architecture

Main process:

- filesystem access
- persistence
- IPC handlers
- OS-level file actions

Renderer:

- React UI
- workspace shell
- canvas interactions
- state management

Shared contracts:

- `src/shared/types.ts`
- `src/shared/ipc.ts`

## Canonical Model

The project uses a split model:

- `FileMeta` for live filesystem metadata
- `ItemLayout` for persisted visual layout
- `GroupModel` for pile state
- `WorkspaceData` for folder-specific app state

Rename behavior in MVP is path-based:

- item identity is the file path
- rename is treated as remove/add during reconciliation
- workspace stability is required
- exact identity continuity is not guaranteed

## Documentation Hierarchy

Use this precedence order when artifacts disagree:

1. `src/shared/types.ts`
2. `src/shared/ipc.ts`
3. [`PRD.md`](/Users/liamellis/Desktop/Piles/PRD.md)
4. [`PLAN.md`](/Users/liamellis/Desktop/Piles/PLAN.md)
5. [`task-manifest.yml`](/Users/liamellis/Desktop/Piles/task-manifest.yml)
6. [`TODO.md`](/Users/liamellis/Desktop/Piles/TODO.md)

Supporting docs:

- [`AGENTS.md`](/Users/liamellis/Desktop/Piles/AGENTS.md): project-local agent
  rules and authority order
- [`PRD.md`](/Users/liamellis/Desktop/Piles/PRD.md): product behavior and scope
- [`PLAN.md`](/Users/liamellis/Desktop/Piles/PLAN.md): canonical implementation
  plan and execution order
- [`task-manifest.yml`](/Users/liamellis/Desktop/Piles/task-manifest.yml):
  machine-readable mirror of the plan
- [`TODO.md`](/Users/liamellis/Desktop/Piles/TODO.md): live execution queue and
  task status

## Getting Started

Requirements:

- Node.js 23+
- npm 10+

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run type checks:

```bash
npm run typecheck
```

## Current Task Progress

Complete:

- T-001 Scaffold app shell
- T-002 Create canonical shared contracts in code
- T-003 Add project-level agent instructions
- T-004 Implement filesystem services
- T-005 Implement persistence services
- T-006 Wire preload bridge and IPC contract

Next:

- T-007 Build renderer store and workspace shell
- T-008 Implement item rendering and movement

See [`TODO.md`](/Users/liamellis/Desktop/Piles/TODO.md) for the full queue.
