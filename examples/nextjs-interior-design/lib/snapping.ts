import {
  add,
  dot,
  rotate,
  scale,
  sub,
  WALL_THICKNESS,
  type Wall,
} from "./geometry";
import type { Furniture, Point, Room } from "./plan";

// Everything lands on a 5 cm grid unless something more interesting is nearby.
export const GRID = 5;

export function snapTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

// The alignment lines shown while dragging: a vertical one at `x`, a
// horizontal one at `y`.
export type Guides = { x: number | null; y: number | null };

export const NO_GUIDES: Guides = { x: null, y: null };

type Targets = { xs: number[]; ys: number[] };

/**
 * The coordinates worth aligning to: every corner on the plan, except the
 * ones being dragged.
 */
export function alignmentTargets(
  rooms: Iterable<Room>,
  isDragged: (roomId: string, cornerId: string) => boolean
): Targets {
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (const room of rooms) {
    for (const corner of room.points) {
      if (!isDragged(room.id, corner.id)) {
        xs.add(corner.x);
        ys.add(corner.y);
      }
    }
  }
  return { xs: [...xs], ys: [...ys] };
}

function nearest(value: number, targets: number[], threshold: number) {
  let best: number | null = null;
  for (const target of targets) {
    const gap = Math.abs(target - value);
    if (gap <= threshold && (best === null || gap < Math.abs(best - value))) {
      best = target;
    }
  }
  return best;
}

/**
 * Snaps a corner: to another corner's x or y when one is within `threshold`
 * (so walls line up across rooms), and to the grid otherwise.
 */
export function snapPoint(
  point: Point,
  targets: Targets,
  threshold: number,
  grid: number
): { point: Point; guides: Guides } {
  const x = nearest(point.x, targets.xs, threshold);
  const y = nearest(point.y, targets.ys, threshold);
  return {
    point: { x: x ?? snapTo(point.x, grid), y: y ?? snapTo(point.y, grid) },
    guides: { x, y },
  };
}

function snapAxis(
  values: number[],
  delta: number,
  targets: number[],
  threshold: number,
  grid: number
) {
  let best: { delta: number; guide: number; gap: number } | null = null;
  for (const value of values) {
    const target = nearest(value + delta, targets, threshold);
    if (target === null) {
      continue;
    }
    const gap = Math.abs(target - (value + delta));
    if (!best || gap < best.gap) {
      best = { delta: target - value, guide: target, gap };
    }
  }
  return best
    ? { delta: best.delta, guide: best.guide }
    : { delta: snapTo(delta, grid), guide: null };
}

/**
 * Snaps a whole room being moved by `delta`: any of its corners can line up
 * with any other corner on the plan, so rooms click together.
 */
export function snapDelta(
  points: readonly Point[],
  delta: Point,
  targets: Targets,
  threshold: number,
  grid: number
): { delta: Point; guides: Guides } {
  const x = snapAxis(
    points.map((point) => point.x),
    delta.x,
    targets.xs,
    threshold,
    grid
  );
  const y = snapAxis(
    points.map((point) => point.y),
    delta.y,
    targets.ys,
    threshold,
    grid
  );
  return {
    delta: { x: x.delta, y: y.delta },
    guides: { x: x.guide, y: y.guide },
  };
}

type WallSnap = { shift: Point; gap: number; normal: Point };

function bestWallSnap(
  item: Pick<Furniture, "x" | "y" | "width" | "depth" | "rotation">,
  walls: Iterable<Wall>,
  threshold: number,
  // Skip walls (nearly) parallel to this normal: they were already handled.
  except: Point | null
) {
  const center = { x: item.x, y: item.y };
  // The piece's own axes, in plan space.
  const u = rotate({ x: 1, y: 0 }, item.rotation);
  const v = rotate({ x: 0, y: 1 }, item.rotation);

  let best: WallSnap | null = null;
  for (const wall of walls) {
    const normal = wall.inward;
    if (except && Math.abs(dot(normal, except)) > 0.5) {
      continue;
    }
    const fromStart = sub(center, wall.a);
    const along = dot(fromStart, wall.dir);
    if (along < 0 || along > wall.length) {
      continue;
    }
    // How far the piece reaches toward the wall, and where its center would
    // be if it stood flush against the wall's face.
    const reach =
      (Math.abs(dot(normal, u)) * item.width +
        Math.abs(dot(normal, v)) * item.depth) /
      2;
    const side = dot(fromStart, normal);
    const flush = (side < 0 ? -1 : 1) * (reach + WALL_THICKNESS / 2);
    const gap = Math.abs(flush - side);
    if (gap <= threshold && (!best || gap < best.gap)) {
      best = { shift: scale(normal, flush - side), gap, normal };
    }
  }
  return best;
}

/**
 * Pushes a piece of furniture flush against the walls it's close to: one
 * wall, or two in a corner. Works for walls and furniture at any angle.
 */
export function snapFurnitureToWalls(
  item: Pick<Furniture, "x" | "y" | "width" | "depth" | "rotation">,
  walls: Wall[],
  threshold: number
): Point {
  let position = { x: item.x, y: item.y };
  const first = bestWallSnap(item, walls, threshold, null);
  if (!first) {
    return position;
  }
  position = add(position, first.shift);

  const second = bestWallSnap(
    { ...item, ...position },
    walls,
    threshold,
    first.normal
  );
  if (second) {
    position = add(position, second.shift);
  }
  return position;
}
