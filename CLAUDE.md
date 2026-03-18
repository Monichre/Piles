# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start all three processes concurrently (main, renderer, electron)
npm test             # Run vitest tests
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + test + build renderer + build main
```

To run a single test file:
```bash
npx vitest run src/main/filesystem-service.test.ts
```

## Architecture

Piles is an Electron + React + TypeScript app. Three build processes run concurrently in dev:

1. **`src/main/`** — Node.js/Electron main process, compiled by `tsup` to `dist-electron/`. Handles all filesystem access, persistence, and IPC.
2. **`src/preload/`** — Electron preload script, also compiled by `tsup`. Bridges main ↔ renderer via `contextBridge`, exposing `window.piles`.
3. **`src/renderer/`** — React app, bundled by Vite. Runs in the browser context with no Node access.

**`src/shared/`** is imported by both main and preload — it must not contain any Electron or Node.js imports.

## Canonical Contracts

These two files are the authority for all data shapes and IPC surface. When docs and code diverge, update the docs.

- **`src/shared/types.ts`** — All domain types: `FileMeta`, `ItemLayout`, `GroupModel`, `WorkspaceData`, `WorkspaceSettings`
- **`src/shared/ipc.ts`** — `PilesAPI` interface, `IPC_CHANNELS` map, `PILES_API_METHODS` list, and `createPreloadPilesApi` factory

The split model is fixed. Never collapse `FileMeta` (live filesystem state) and `ItemLayout` (persisted visual position) into one record.

## IPC Pattern

All renderer→main calls go through `window.piles` (typed as `PilesAPI`). New IPC methods require:
1. Add the method to `PilesAPI` in `src/shared/ipc.ts`
2. Add the channel name to `IPC_CHANNELS`
3. Add the method name to `PILES_API_METHODS`
4. Add the handler in `src/main/ipc.ts` → `registerIpcHandlers`
5. The preload factory in `src/shared/ipc.ts` picks it up automatically

The renderer must never call Electron APIs directly — always go through the preload bridge.

## Hard Rules

- Grouping must not mutate files on disk — groups are virtual layout only
- Workspace persistence (`{userData}/Piles/workspaces/{sha256(folderPath)}.json`) is not canonical for live filesystem state — `getFolderItems` is
- Rename is treated as remove+add during reconciliation; item identity is path-based
- Do not reintroduce removed API names

## Execution Wave Order

Follow `docs/TODO.md` for the active queue. Waves are:

1. Scaffold and contracts ✅
2. Filesystem and persistence ✅
3. Canvas (renderer store, item rendering, drag, selection)
4. Groups (pile membership, collapse, headers)
5. File actions and sync (watch, reconcile, rename/trash)
6. Auto-group and QA
