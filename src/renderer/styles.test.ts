import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const tokens = readFileSync(
  new URL("../../tokens.css", import.meta.url),
  "utf8",
);

describe("canvas item stylesheet", () => {
  it("clamps long filenames instead of letting them overflow the card", () => {
    // Replaces the old assertion on the decorative .ci-preview box (removed —
    // it carried no information the badge did not already carry). The intent
    // it guarded, filenames staying readable, is asserted directly.
    expect(styles).toMatch(/\.ci-name\s*\{[^}]*-webkit-line-clamp:\s*2/);
    expect(styles).toMatch(/\.ci-name\s*\{[^}]*overflow-wrap:\s*anywhere/);
  });

  it("keeps the rename input metrically identical to the resting name", () => {
    // The PRD requires inline rename "without layout jitter". The previous
    // implementation dropped from 0.79rem to 0.71rem and added padding on
    // entry, which visibly reflowed the card.
    const resting = styles.match(/\.ci-name\s*\{([^}]*)\}/)?.[1] ?? "";
    const editing = styles.match(/\.ci-name--editing\s*\{([^}]*)\}/)?.[1] ?? "";

    const fontSize = (block: string) =>
      block.match(/font-size:\s*([^;]+)/)?.[1];
    const lineHeight = (block: string) =>
      block.match(/line-height:\s*([^;]+)/)?.[1];

    expect(fontSize(editing)).toBe(fontSize(resting));
    expect(lineHeight(editing)).toBe(lineHeight(resting));
  });
});

describe("design system discipline", () => {
  it("routes every colour through a token", () => {
    // The stylesheet this replaced defined nine tokens and then wrote
    // rgba(255,255,255,0.08) inline twenty times. Colour literals in the page
    // stylesheet are the drift this guards against; tokens.css is where
    // literals legitimately live.
    const withoutComments = styles.replace(/\/\*[\s\S]*?\*\//g, "");
    const literals = withoutComments.match(
      /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\boklch\([^)]*\)/g,
    );
    expect(literals ?? []).toEqual([]);
  });

  it("gives every focusable control a visible outline, never outline:none", () => {
    // Four focus indicators previously measured 1.30-2.57:1 against their own
    // surfaces, below the 3:1 WCAG 1.4.11 floor, because they were built from
    // low-alpha box-shadows with outline suppressed.
    expect(styles).not.toMatch(/outline:\s*none/);

    const focusRules = styles.match(/:focus-visible[^{]*\{[^}]*\}/g) ?? [];
    expect(focusRules.length).toBeGreaterThan(0);
    for (const rule of focusRules) {
      expect(rule).toMatch(/outline:\s*2px solid var\(--color-focus\)/);
    }
  });

  it("supports reduced motion", () => {
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it("never uses the browser default easing", () => {
    // `ease` as a bare timing function; --ease-out / --ease-in-out are fine.
    expect(styles).not.toMatch(/transition:[^;]*\s\d+m?s\s+ease\s*[;,]/);
  });

  it("defines the tokens the stylesheet consumes", () => {
    const used = new Set(
      Array.from(styles.matchAll(/var\((--[a-z0-9-]+)\)/g), (m) => m[1]),
    );
    const defined = new Set(
      Array.from(tokens.matchAll(/^\s*(--[a-z0-9-]+):/gm), (m) => m[1]),
    );
    const missing = [...used].filter((name) => !defined.has(name));
    expect(missing).toEqual([]);
  });
});
