# /drive — Self-driving work loop

Autonomously work through the task queue in `docs/TODO.md` until blocked or done.

## Loop

1. Read `docs/TODO.md` — identify the current wave's next unchecked task
2. Check `AGENTS.md` for any authority rules that constrain this task
3. Mark task in_progress in TODO.md
4. Implement the task
   - Main process changes in `src/main/` (Node/Electron)
   - Renderer changes in `src/renderer/` (React)
   - Shared types only in `src/shared/types.ts` or `src/shared/ipc.ts`
5. Run `/check` — fix any failures before continuing
6. Mark task done in TODO.md
7. Repeat

## Architecture Constraints (always respect)

- Never put Node/Electron imports in `src/shared/`
- IPC changes require updating both `src/shared/ipc.ts` AND the preload script
- Never collapse `FileMeta` and `ItemLayout` into one type
- All filesystem access only in `src/main/`

## Stop Conditions

- No more tasks in current wave
- `/check` fails after 2 cycles
- Task touches IPC surface in a non-obvious way — pause and explain to user
- 4+ tasks completed — check in
