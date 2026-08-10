# Todo

- [x] UI audit wave 1: fix empty-canvas pointer interactions in `src/renderer/Canvas.tsx`.
- [x] UI audit wave 1: reduce top-left canvas chrome collisions and improve first visible interaction area.
- [x] UI audit wave 1: keep the inspector present with a zero-selection guidance state.
- [x] UI audit wave 1: improve button hierarchy, focus-visible states, and card text contrast in `src/renderer/styles.css`.
- [x] UI audit wave 1: run `npm run typecheck` and targeted verification for canvas/selection behavior.

## Review

- Verified with `npm run typecheck`.
- Verified recent UI behavior and visual state in Storybook.
- Confirmed persistent empty-selection inspector guidance.
- Confirmed the top-left board area no longer shows the previous hint/origin chrome.

- [x] UI audit wave 2: show active pile drop targets while dragging cards.
- [x] UI audit wave 2: add keyboard activation parity for focused canvas cards.
- [x] UI audit wave 2: run `npm run typecheck`, Storybook, and Playwright verification.

- [x] Review current `docs/PRD.md` MVP canvas/items/piles/layout persistence sections.
- [x] Insert a simple, beautiful canvas + whiteboard UI layer outline into `docs/PRD.md`.
- [x] Add a design-to-wave mapping block so UX work is traceable to `docs/PLAN.md`.
- [x] Verify PRD markdown structure and headings remain consistent.
