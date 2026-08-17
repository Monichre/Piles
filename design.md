# Design — Piles

A locked design system for this app. Every page/surface redesign reads this file
before emitting code. Do not regenerate per surface — extend or amend this file
when the system needs to grow.

Derived from the *Infinite Canvas Browser* / *Orbit Canvas* mockups. Brand values
are preserved; everything that failed a measured contrast check was replaced.
All ratios below are WCAG 2.1, computed against the stated surface with alpha
composited down the real stack.

## Genre

**modern-minimal** (Linear / Raycast school).

Chosen deliberately, not by default: modern-minimal is the one genre that
*permits* zero-chroma neutrals, which is what lets the mockups' pure-grey ramp
(`#111111` / `#737373`) survive untinted. Under editorial or atmospheric the
greys would have had to be warmed, and the brand would have drifted.

## Macrostructure family

- **App surfaces** — **Workbench**. Toolbar rail, bounded work surface, sibling
  inspector. Variation lives in the chrome archetype, not the shape.
- **Entry states** (idle / loading / empty / error) — centred prompt card on the
  dot grid. One card, one headline, one action.

The three source mockups are three legitimate chrome variants of the one
Workbench family: bottom tray · grid + filter pills · floating dock + ⌘K. They
differ on nav archetype only; they share every token below.

## Theme

| Token | Value | Provenance |
|---|---|---|
| `--color-paper` | `oklch(98.5% 0 90)` | `#FAFAFA` — brand, unchanged |
| `--color-paper-2` | `oklch(100% 0 90)` | raised surface |
| `--color-paper-3` | `oklch(96.2% 0 90)` | recessed wells |
| `--color-ink` | `oklch(17.8% 0 90)` | `#111111` — brand · 18.09:1 |
| `--color-ink-2` | `oklch(55.6% 0 90)` | `#737373` — brand · 4.54:1 |
| `--color-ink-3` | `oklch(71.5% 0 90)` | `#A3A3A3` — **non-text only**, 2.42:1 |
| `--color-rule` | `oklch(65% 0 90)` | new · 3.10:1 — identifying borders |
| `--color-rule-soft` | `oklch(87% 0 90)` | decorative hairlines |
| `--color-accent` | `oklch(48.8% 0.217 264)` | new · 6.42:1 on paper |
| `--color-accent-ink` | `oklch(100% 0 90)` | 6.70:1 on accent fill |
| `--color-focus` | `oklch(54.6% 0.215 263)` | 4.95:1 paper · 5.12:1 glass |

### The two-step ink ramp

The mockups shipped three text greys. **A third legible step does not exist on
this paper.** `--color-ink-2` (`#737373`) passes at 4.54:1 — barely — and the
next grey below it that also passes is *darker* than it. `--color-ink-3` is
therefore demoted to a non-text role: dividers, disabled marks, the resize
glyph. Never set it as `color` on text.

### Document tones

A semantic **category** ramp, not accent. These classify file kinds the way
syntax highlighting classifies tokens, so they are exempt from the ≤5% accent
budget. Fills are brand and unchanged; every foreground was illegible on its own
fill and was darkened at constant hue.

| Tone | Fill | Foreground | Was | Now | Maps to |
|---|---|---|---|---|---|
| green | `#E1F4E8` | `oklch(44.8% 0.108 151)` | 1.99:1 | **6.22:1** | documents, prose |
| yellow | `#FFF3CD` | `oklch(47.6% 0.103 62)` | 1.73:1 | **6.18:1** | images, audio, video |
| red | `#FDE2E2` | `oklch(50.5% 0.190 28)` | 3.07:1 | **5.28:1** | code, config, data |
| plain | `#FFFFFF` | `oklch(55.6% 0 90)` | — | — | everything else, folders |

Mapping lives in `src/renderer/presentation.ts` → `getItemTone()`. It is purely
presentational and never touches `FileMeta` or the filesystem.

## Typography

2 + 1. Inter stays as body — it is a good UI face; using it as display *as well*
was the failure.

- **Display** — Instrument Sans Variable, 600, roman, `-0.03em`
- **Body** — Inter Variable, 400/500
- **Outlier** — IBM Plex Mono, 400/500 — **numerals and paths only** (counts,
  sizes, extensions, the folder path). Capped at those slots by design.

All three are self-hosted via `@fontsource*`, so the app renders identically
offline and on every OS. The previous stack (`"Avenir Next", "Segoe UI"`) loaded
nothing and resolved to a different face per platform.

Scale — six steps, down from ten ad-hoc sizes. **`--text-2xs` (11px) is the
floor; nothing ships below it.** The mockups had 9.3px labels.

## Spacing

4-point named scale in `tokens.css`. `--space-lg` is **24px**, the same cell as
`--grid-size`, so chrome aligns to the board's own rhythm. Use named tokens
(`var(--space-md)`), never raw values.

## Radius

Four steps — `--radius-sm` 8 · `--radius-md` 12 · `--radius-lg` 20 ·
`--radius-pill`. Down from fifteen distinct values across the mockups.

## Motion

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out`.
  **Never the bare browser default `ease`**, never overshoot on UI state — the
  mockups shipped `cubic-bezier(0.175, 0.885, 0.32, 1.275)` on interface
  elements.
- Durations: `--dur-instant` 80ms · `--dur-short` 140ms · `--dur-mid` 220ms.
- Animate `transform` and `opacity` only.
- **Reduced motion is mandatory.** Spatial motion collapses; colour transitions
  survive because they carry state (selected, hover, drop-target).

## Focus

**Every focusable control gets `outline: 2px solid var(--color-focus)`.**

- `outline`, never `box-shadow` — box-shadow inherits element transitions and
  the ring fades in, leaving keyboard users without an indicator for the first
  frames.
- `outline: none` is banned outright and asserted against in
  `src/renderer/styles.test.ts`.
- Positive `outline-offset` normally; negative inside any clipping ancestor
  (`.ci`, `.pile-card`, `.ctx-menu`).

## Microinteractions

- **One hover signal per element.** Not translate + border + shadow + colour.
- Silent success. Toasts only for failures and invisible effects.
- Hover tooltip delay 800ms · focus delay 0ms.
- Draggable objects do not move on hover.

## CTA voice

- **Primary** — solid `--color-accent` fill, `--color-accent-ink` text,
  `--radius-sm`, 32px min height, sentence case.
- **Secondary** — `--color-paper-2` fill with `--color-rule-soft` border.
- **Quiet** — transparent until hover.
- **Danger** — `--color-danger-wash` fill, inverting to solid on hover.
- One label per action across every state. Not "Open folder…" / "Try another
  folder…" / "Open a different folder…" for the same button.

## Per-surface allowances

- App surfaces: no enrichment. Function carries the screen.
- Entry states: the dot grid only.
- The dot grid is the board's **measurement substrate** — it belongs on the
  canvas and entry states, never behind chrome. One grid, one cell size.

## What surfaces MUST share

- The token set. Every colour and font comes through `var(--token)`; colour
  literals in a page stylesheet are drift, and `styles.test.ts` fails the build
  on them.
- The focus treatment.
- The type pairing and the 11px floor.
- The CTA voice.

## What surfaces MAY differ on

- Chrome archetype within the Workbench family (tray · rail · dock · ⌘K).
- Which inspector blocks are present.

## Eyebrows

Default **off**. Exactly one legitimate use exists: the state label stacked
directly above its headline in the entry states, same column. Never
tag-left/heading-right. The toolbar's "Active folder" and "Studio board"
eyebrows were removed — a monospace path already says it is a path.

## Stamp

Every surface stylesheet opens with:

```
/* Hallmark · macrostructure: Workbench · genre: modern-minimal
 * design-system: design.md · designed-as-app */
```

`designed-as-app` tells future runs to read this file rather than invent a
system, and inverts the diversification rule: surfaces here **share**, they do
not rotate.

## Exports

`tokens.css` at the project root is the canonical export and the file the
renderer imports. Regenerate other formats (Tailwind `@theme`, DTCG
`tokens.json`, shadcn variables) from it if another project needs them.
