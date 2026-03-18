import { memo, type CSSProperties, type PointerEvent } from "react";

import type { FileMeta, Point } from "../shared/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CanvasItemProps {
  item: FileMeta;
  position: Point;
  zIndex: number;
  selected: boolean;
  onPointerDown: (e: PointerEvent<HTMLDivElement>, id: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEM_WIDTH = 96;
const ITEM_HEIGHT = 80;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CanvasItem = memo(function CanvasItem({
  item,
  position,
  zIndex,
  selected,
  onPointerDown,
}: CanvasItemProps) {
  const style: CSSProperties = {
    position: "absolute",
    left: position.x,
    top: position.y,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    zIndex,
    // Prevent text selection during drag.
    userSelect: "none",
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    onPointerDown(e, item.id);
  };

  return (
    <div
      className={`ci${selected ? " ci--selected" : ""}${item.kind === "folder" ? " ci--folder" : " ci--file"}`}
      style={style}
      onPointerDown={handlePointerDown}
      data-item-id={item.id}
      aria-label={item.name}
      role="button"
      tabIndex={0}
    >
      <span className="ci-icon" aria-hidden="true">
        {item.kind === "folder" ? "📁" : "📄"}
      </span>
      <span className="ci-name" title={item.name}>
        {item.name}
      </span>
    </div>
  );
});
