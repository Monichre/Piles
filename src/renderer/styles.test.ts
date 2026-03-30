import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("canvas item stylesheet", () => {
  it("positions the decorative preview inside its own box so filenames stay readable", () => {
    expect(styles).toContain(`.ci-preview {
  height: 22px;
  position: relative;`);
  });
});
