Goal: Enhance `docs/PRD.md` with a clear, implementable "canvas + whiteboard" UI layer spec over the macOS filesystem.

Constraints to preserve:
- MVP scope stays the same (no AI/grouping beyond deterministic auto-group; no Finder replacement; no multi-folder workspaces; no collaboration; no tagging).
- Canvas is bounded (no zoom required) and must remain usable with ~100-200 items.
- Selection, multi-select, marquee, drag-and-drop are already specified in the PRD; design must clearly map to those mechanics.
- Layout state persistence must correspond 1:1 to persisted fields (item positions, membership, pile geometry, collapsed state, workspace settings).

Pseudocode steps:
1. Read `docs/PRD.md` section `## 4. MVP Capabilities`:
   - locate `### Canvas` after `Constraints` bullets.
   - locate `### Items` after `Supported actions` bullets.
   - locate `### Piles` after the "Important rule" bullets.
   - locate `### Layout Persistence` after the `Persist` bullet list (before `Auto-save on`).
   - locate the end of `## 4. MVP Capabilities` before `## 5. Canonical Product Decisions`.
2. Insert a new subsection under `### Canvas` that defines:
   - visual/interaction philosophy
   - minimal recommended UI layout (top bar, bounded whiteboard, side inspector)
   - simple styling rules (paper/grid background, card/pile appearance)
   - performance considerations for frequent pointer movement.
3. Insert a new subsection under `### Items` specifying:
   - hover/selection/drag consistency expectations
   - double-click/open, rename affordance (inline rename), reveal/trash via consistent actions
   - context menu behavior and minimal keyboard shortcut parity (only where necessary).
4. Insert a new subsection under `### Piles` specifying:
   - pile container visuals (header, collapse affordance, resize handle)
   - pile creation behavior and initial geometry constraints inside the bounded canvas
   - drag/drop membership behavior for single and multi-selection, including drop-out behavior.
5. Add a short "Visual persistence mapping" sentence under `### Layout Persistence` to explicitly tie UI state to persisted fields.
6. Add a "Design-to-Implementation Mapping" block that maps PRD UI subsections to `docs/PLAN.md` waves (Wave 3 Canvas, Wave 4 Groups, Wave 5 File actions, Wave 6 QA).
7. Sanity check:
   - headings are correctly nested
   - no contradictory scope statements
   - no new product capabilities beyond what the PRD already permits.

