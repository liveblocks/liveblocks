import { memo, type PointerEvent } from "react";
import { furnitureExtents } from "@/lib/geometry";
import type { Furniture } from "@/lib/plan";
import { formatSize, type Unit } from "@/lib/units";
import { FurnitureSymbol } from "./symbols";

/**
 * A piece of furniture on the plan. Memoized: while someone drags one piece
 * (a Storage update per frame), the others keep the same object in Storage
 * and don't re-render.
 */
export const FurnitureShape = memo(function FurnitureShape({
  item,
  onPointerDown,
}: {
  item: Furniture;
  onPointerDown: (event: PointerEvent<SVGGElement>, item: Furniture) => void;
}) {
  return (
    <g
      transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}
      style={{ cursor: "move" }}
      onPointerDown={(event) => onPointerDown(event, item)}
    >
      <FurnitureSymbol type={item.type} width={item.width} depth={item.depth} />
      <rect
        x={-item.width / 2}
        y={-item.depth / 2}
        width={item.width}
        height={item.depth}
        fill="transparent"
      />
    </g>
  );
});

/**
 * Handles of the selected piece: its outline, a square on every corner to
 * resize it, and a round one sticking out of its back to rotate it.
 */
export function FurnitureHandles({
  item,
  zoom,
  unit,
  onResizePointerDown,
  onRotatePointerDown,
}: {
  item: Furniture;
  zoom: number;
  unit: Unit;
  onResizePointerDown: (
    event: PointerEvent<SVGRectElement>,
    item: Furniture,
    x: -1 | 1,
    y: -1 | 1
  ) => void;
  onRotatePointerDown: (
    event: PointerEvent<SVGCircleElement>,
    item: Furniture
  ) => void;
}) {
  const halfWidth = item.width / 2;
  const halfDepth = item.depth / 2;
  const handle = 4 / zoom;
  const stem = 22 / zoom;
  // Corner cursors swap when the piece lies on its side.
  const sideways = Math.round(item.rotation / 90) % 2 !== 0;
  const corners: [-1 | 1, -1 | 1][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  // The size label goes below the piece, or above it when the rotation
  // handle is the one pointing down.
  const extents = furnitureExtents(item);
  const flipped = item.rotation > 135 && item.rotation < 225;
  const labelY = flipped
    ? item.y - extents.y - 14 / zoom
    : item.y + extents.y + 14 / zoom;

  return (
    <>
      <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}>
        <rect
          x={-halfWidth}
          y={-halfDepth}
          width={item.width}
          height={item.depth}
          className="plan-outline"
          pointerEvents="none"
        />
        <line
          x1={0}
          y1={-halfDepth}
          x2={0}
          y2={-halfDepth - stem}
          className="plan-outline"
          pointerEvents="none"
        />
        <circle
          cx={0}
          cy={-halfDepth - stem}
          r={5 / zoom}
          className="plan-handle"
          style={{ cursor: "grab" }}
          onPointerDown={(event) => onRotatePointerDown(event, item)}
        />
        {corners.map(([x, y]) => (
          <rect
            key={`${x}${y}`}
            x={x * halfWidth - handle}
            y={y * halfDepth - handle}
            width={handle * 2}
            height={handle * 2}
            rx={1 / zoom}
            className="plan-handle"
            style={{
              cursor: x * y > 0 !== sideways ? "nwse-resize" : "nesw-resize",
            }}
            onPointerDown={(event) => onResizePointerDown(event, item, x, y)}
          />
        ))}
      </g>
      <g className="plan-dimension" data-accent="" pointerEvents="none">
        <text
          x={item.x}
          y={labelY}
          fontSize={10.5 / zoom}
          strokeWidth={5 / zoom}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {formatSize(item.width, unit)} × {formatSize(item.depth, unit)}
        </text>
      </g>
    </>
  );
}
