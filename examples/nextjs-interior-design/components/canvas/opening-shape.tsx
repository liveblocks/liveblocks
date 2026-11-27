import type { PointerEvent } from "react";
import { fitOpening, WALL_THICKNESS, type Wall } from "@/lib/geometry";
import type { Opening } from "@/lib/plan";

type OpeningShapeProps = {
  opening: Pick<
    Opening,
    "kind" | "style" | "offset" | "width" | "hinge" | "swing"
  >;
  wall: Wall;
  zoom: number;
  // Color of the frame drawn around the opening when someone has it selected.
  outline?: string;
  // Drawn translucent, as a preview of where a new opening would go.
  ghost?: boolean;
  onPointerDown?: (event: PointerEvent<SVGGElement>) => void;
};

/**
 * A door or window, drawn the way it is on a floor plan. It's drawn in its
 * wall's own frame: x runs along the wall, y across it, and the opening is
 * centered on the origin. A white gap covers the wall underneath (and any
 * other room's wall that shares the same line), with the symbol on top.
 */
export function OpeningShape({
  opening,
  wall,
  zoom,
  outline,
  ghost,
  onPointerDown,
}: OpeningShapeProps) {
  const { width, center } = fitOpening(opening, wall);
  if (width < 10) {
    return null;
  }

  const half = width / 2;
  const thickness = WALL_THICKNESS;
  // Thick enough to grab, even when the wall is only a few pixels wide.
  const grab = Math.max(thickness, 20 / zoom);
  const pad = 3 / zoom;

  return (
    <g
      className="plan-opening"
      data-ghost={ghost ? "" : undefined}
      transform={`translate(${center.x} ${center.y}) rotate(${wall.angle})`}
      onPointerDown={onPointerDown}
    >
      <rect
        className="gap"
        x={-half}
        y={-thickness / 2 - 0.75}
        width={width}
        height={thickness + 1.5}
      />
      {opening.kind === "window" ? (
        <Window half={half} />
      ) : (
        <Door opening={opening} wall={wall} half={half} />
      )}
      {outline ? (
        <rect
          className="plan-outline"
          x={-half - pad}
          y={-thickness / 2 - pad}
          width={width + pad * 2}
          height={thickness + pad * 2}
          rx={2 / zoom}
          style={{ stroke: outline }}
        />
      ) : null}
      {onPointerDown ? (
        <rect
          x={-half}
          y={-grab / 2}
          width={width}
          height={grab}
          fill="transparent"
          style={{ cursor: "move" }}
        />
      ) : null}
    </g>
  );
}

// A window: the wall's two faces, with the glazing as two lines between them.
function Window({ half }: { half: number }) {
  const thickness = WALL_THICKNESS;
  return (
    <>
      <rect
        className="frame"
        x={-half}
        y={-thickness / 2}
        width={half * 2}
        height={thickness}
      />
      <line x1={-half} y1={-thickness / 6} x2={half} y2={-thickness / 6} />
      <line x1={-half} y1={thickness / 6} x2={half} y2={thickness / 6} />
    </>
  );
}

function Door({
  opening,
  wall,
  half,
}: {
  opening: Pick<Opening, "style" | "hinge" | "swing">;
  wall: Wall;
  half: number;
}) {
  const thickness = WALL_THICKNESS;
  const width = half * 2;
  // +1 when the door swings toward positive y in the wall's frame.
  const side = wall.inwardSign * (opening.swing === "in" ? 1 : -1);
  // Which end the door is hinged on: -1 for the start of the opening.
  const hinge = opening.hinge === "start" ? -1 : 1;

  const jambs = (
    <>
      <line x1={-half} y1={-thickness / 2} x2={-half} y2={thickness / 2} />
      <line x1={half} y1={-thickness / 2} x2={half} y2={thickness / 2} />
    </>
  );

  if (opening.style === "archway") {
    return (
      <>
        {jambs}
        <line
          className="swing dashed"
          x1={-half}
          y1={-thickness / 2}
          x2={half}
          y2={-thickness / 2}
        />
        <line
          className="swing dashed"
          x1={-half}
          y1={thickness / 2}
          x2={half}
          y2={thickness / 2}
        />
      </>
    );
  }

  if (opening.style === "sliding") {
    const overlap = Math.min(6, width * 0.05);
    return (
      <>
        {jambs}
        <rect
          className="frame"
          x={-half}
          y={-3.5}
          width={half + overlap}
          height={3.5}
        />
        <rect
          className="frame"
          x={-overlap}
          y={0}
          width={half + overlap}
          height={3.5}
        />
      </>
    );
  }

  if (opening.style === "double") {
    // Two leaves, hinged at either end and meeting in the middle.
    return (
      <>
        {jambs}
        <path
          className="swing"
          d={`M ${-half} ${side * half} A ${half} ${half} 0 0 ${side < 0 ? 1 : 0} 0 0`}
        />
        <path
          className="swing"
          d={`M ${half} ${side * half} A ${half} ${half} 0 0 ${side > 0 ? 1 : 0} 0 0`}
        />
        <line className="leaf" x1={-half} y1={0} x2={-half} y2={side * half} />
        <line className="leaf" x1={half} y1={0} x2={half} y2={side * half} />
      </>
    );
  }

  // A single leaf, drawn open at 90°, with the arc it sweeps when closing.
  return (
    <>
      {jambs}
      <path
        className="swing"
        d={`M ${hinge * half} ${side * width} A ${width} ${width} 0 0 ${hinge * side > 0 ? 1 : 0} ${-hinge * half} 0`}
      />
      <line
        className="leaf"
        x1={hinge * half}
        y1={0}
        x2={hinge * half}
        y2={side * width}
      />
    </>
  );
}
