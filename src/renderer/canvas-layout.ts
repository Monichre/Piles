import type { FileMeta, ItemLayout, Point } from "../shared/types";

import { defaultPositionForIndex } from "./useDrag";

const INITIAL_LAYOUT_START_X = 56;
const INITIAL_LAYOUT_START_Y = 156;
const INITIAL_LAYOUT_COLS = 8;
const INITIAL_LAYOUT_COL_WIDTH = 124;
const INITIAL_LAYOUT_ROW_HEIGHT = 108;

function neutralInitialPositionForIndex(index: number): Point {
  return {
    x: INITIAL_LAYOUT_START_X + (index % INITIAL_LAYOUT_COLS) * INITIAL_LAYOUT_COL_WIDTH,
    y:
      INITIAL_LAYOUT_START_Y +
      Math.floor(index / INITIAL_LAYOUT_COLS) * INITIAL_LAYOUT_ROW_HEIGHT,
  };
}

export function buildFallbackPositions(
  items: FileMeta[],
  itemLayouts: Record<string, ItemLayout>
): Record<string, Point> {
  const defaults: Record<string, Point> = {};
  const hasSavedLayouts = Object.keys(itemLayouts).length > 0;

  let fallbackIndex = 0;
  for (const item of items) {
    if (itemLayouts[item.id]) {
      continue;
    }

    defaults[item.id] = hasSavedLayouts
      ? defaultPositionForIndex(fallbackIndex)
      : neutralInitialPositionForIndex(fallbackIndex);
    fallbackIndex += 1;
  }

  return defaults;
}
