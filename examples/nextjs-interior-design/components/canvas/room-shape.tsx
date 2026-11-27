import type { PointerEvent } from "react";
import {
  boundsOf,
  polygonArea,
  scale,
  visualCenter,
  WALL_THICKNESS,
  wallsOf,
  type Wall,
} from "@/lib/geometry";
import type { Corner, Room } from "@/lib/plan";
import { formatArea, formatLength, type Unit } from "@/lib/units";
import { Dimension } from "./dimension";

function outline(room: Room) {
  return room.points.map((point) => `${point.x},${point.y}`).join(" ");
}

/** The floor of a room: what you grab to select it and move it around. */
export function RoomFloor({
  room,
  onPointerDown,
}: {
  room: Room;
  onPointerDown: (event: PointerEvent<SVGGElement>, room: Room) => void;
}) {
  const points = outline(room);
  return (
    <g onPointerDown={(event) => onPointerDown(event, room)}>
      <polygon points={points} className="plan-floor" />
      {room.floor !== "none" ? (
        <polygon
          points={points}
          fill={`url(#floor-${room.floor})`}
          pointerEvents="none"
        />
      ) : null}
    </g>
  );
}

function wallCursor(wall: Wall) {
  if (Math.abs(wall.dir.y) < 0.2) {
    return "ns-resize";
  }
  if (Math.abs(wall.dir.x) < 0.2) {
    return "ew-resize";
  }
  return "move";
}

/**
 * The walls of a room: one thick outline, plus an invisible, easier to grab
 * line over each wall for dragging it in and out.
 */
export function RoomWalls({
  room,
  zoom,
  onWallPointerDown,
}: {
  room: Room;
  zoom: number;
  onWallPointerDown: (
    event: PointerEvent<SVGLineElement>,
    room: Room,
    wall: Wall
  ) => void;
}) {
  return (
    <g>
      <polygon
        points={outline(room)}
        className="plan-wall"
        strokeWidth={WALL_THICKNESS}
      />
      {wallsOf(room).map((wall) => (
        <line
          key={wall.id}
          x1={wall.a.x}
          y1={wall.a.y}
          x2={wall.b.x}
          y2={wall.b.y}
          stroke="transparent"
          strokeWidth={Math.max(WALL_THICKNESS, 16 / zoom)}
          style={{ cursor: wallCursor(wall) }}
          onPointerDown={(event) => onWallPointerDown(event, room, wall)}
        />
      ))}
    </g>
  );
}

/**
 * Handles of the selected room: a round one on every corner to move it, and a
 * "+" in the middle of every wall to pull a new corner out of it.
 */
export function RoomHandles({
  room,
  zoom,
  onCornerPointerDown,
  onMidpointPointerDown,
}: {
  room: Room;
  zoom: number;
  onCornerPointerDown: (
    event: PointerEvent<SVGCircleElement>,
    room: Room,
    corner: Corner
  ) => void;
  onMidpointPointerDown: (
    event: PointerEvent<SVGGElement>,
    room: Room,
    wall: Wall
  ) => void;
}) {
  const plus = 2.75 / zoom;
  return (
    <g>
      <polygon
        points={outline(room)}
        className="plan-outline"
        pointerEvents="none"
      />
      {wallsOf(room).map((wall) => {
        // Only on walls long enough to have room for it between the corners.
        if (wall.length * zoom < 64) {
          return null;
        }
        const x = (wall.a.x + wall.b.x) / 2;
        const y = (wall.a.y + wall.b.y) / 2;
        return (
          <g
            key={wall.id}
            className="plan-add-handle"
            style={{ cursor: "copy" }}
            onPointerDown={(event) => onMidpointPointerDown(event, room, wall)}
          >
            <circle cx={x} cy={y} r={6.5 / zoom} />
            <path
              d={`M ${x - plus} ${y} H ${x + plus} M ${x} ${y - plus} V ${y + plus}`}
            />
          </g>
        );
      })}
      {room.points.map((corner) => (
        <circle
          key={corner.id}
          cx={corner.x}
          cy={corner.y}
          r={5.5 / zoom}
          className="plan-handle"
          style={{ cursor: "move" }}
          onPointerDown={(event) => onCornerPointerDown(event, room, corner)}
        />
      ))}
    </g>
  );
}

/** The room's name and floor area, in the middle of the room. */
export function RoomLabel({
  room,
  zoom,
  unit,
}: {
  room: Room;
  zoom: number;
  unit: Unit;
}) {
  const bounds = boundsOf(room.points);
  // Hidden when the room is too small on screen to hold it.
  if (
    !bounds ||
    (bounds.maxX - bounds.minX) * zoom < 72 ||
    (bounds.maxY - bounds.minY) * zoom < 44
  ) {
    return null;
  }
  const center = visualCenter(room.points);
  return (
    <g
      className="plan-label"
      transform={`translate(${center.x} ${center.y}) scale(${1 / zoom})`}
    >
      <text className="name" y={-7}>
        {room.name || "Room"}
      </text>
      <text className="area" y={8}>
        {formatArea(polygonArea(room.points), unit)}
      </text>
    </g>
  );
}

/** The length of every wall of a room, written along its outside. */
export function RoomDimensions({
  room,
  zoom,
  unit,
  accent,
}: {
  room: Room;
  zoom: number;
  unit: Unit;
  accent?: boolean;
}) {
  return (
    <>
      {wallsOf(room).map((wall) => (
        <Dimension
          key={wall.id}
          a={wall.a}
          b={wall.b}
          normal={scale(wall.inward, -1)}
          gap={WALL_THICKNESS / 2 + 16 / zoom}
          label={formatLength(wall.length, unit)}
          zoom={zoom}
          accent={accent}
        />
      ))}
    </>
  );
}
