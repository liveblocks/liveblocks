import type { Corner, Furniture, Opening, Point, Room } from "./plan";

// Walls are drawn centered on the room outline, this thick (in centimeters).
export const WALL_THICKNESS = 12;

export type Wall = {
  // The id of the corner this wall starts at.
  id: string;
  roomId: string;
  a: Point;
  b: Point;
  length: number;
  // Unit vector from `a` to `b`, and its angle in degrees.
  dir: Point;
  angle: number;
  // Unit vector perpendicular to the wall, pointing into the room.
  inward: Point;
  // 1 when `inward` is the wall direction turned clockwise, -1 otherwise.
  // Openings are drawn in the wall's own frame and use this to know which
  // side the room is on.
  inwardSign: 1 | -1;
};

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Point, factor: number): Point {
  return { x: a.x * factor, y: a.y * factor };
}

export function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to a tenth of a centimeter, to keep stored numbers short. */
export function round(value: number) {
  return Math.round(value * 10) / 10;
}

/** Rotates a vector clockwise (in screen space) by `degrees`. */
export function rotate(v: Point, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

export function normalizeAngle(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

/** Positive when the points run clockwise on screen (y pointing down). */
export function signedArea(points: readonly Point[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function polygonArea(points: readonly Point[]) {
  return Math.abs(signedArea(points));
}

export function perimeter(points: readonly Point[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    sum += distance(points[i], points[(i + 1) % points.length]);
  }
  return sum;
}

export function boundsOf(points: Iterable<Point>): Bounds | null {
  let bounds: Bounds | null = null;
  for (const { x, y } of points) {
    if (!bounds) {
      bounds = { minX: x, minY: y, maxX: x, maxY: y };
    } else {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return bounds;
}

export function pointInPolygon(point: Point, points: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** The closest point to `point` on the segment from `a` to `b`. */
export function closestOnSegment(point: Point, a: Point, b: Point) {
  const ab = sub(b, a);
  const lengthSquared = dot(ab, ab);
  const t =
    lengthSquared === 0
      ? 0
      : clamp(dot(sub(point, a), ab) / lengthSquared, 0, 1);
  const closest = add(a, scale(ab, t));
  return { t, point: closest, distance: distance(point, closest) };
}

function distanceToOutline(point: Point, points: readonly Point[]) {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    min = Math.min(min, closestOnSegment(point, a, b).distance);
  }
  return min;
}

const visualCenters = new WeakMap<readonly Point[], Point>();

/**
 * Where to put a room's label: the point inside the outline that's farthest
 * from any wall. Unlike the centroid, it always lands inside L-shaped rooms.
 * Cached per outline, since Storage hands back the same array until it changes.
 */
export function visualCenter(points: readonly Point[]): Point {
  const cached = visualCenters.get(points);
  if (cached) {
    return cached;
  }

  const bounds = boundsOf(points);
  let best: Point = bounds
    ? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
    : { x: 0, y: 0 };

  if (bounds && points.length >= 3) {
    const STEPS = 24;
    let bestDistance = -1;
    for (let i = 1; i < STEPS; i++) {
      for (let j = 1; j < STEPS; j++) {
        const candidate = {
          x: bounds.minX + ((bounds.maxX - bounds.minX) * i) / STEPS,
          y: bounds.minY + ((bounds.maxY - bounds.minY) * j) / STEPS,
        };
        if (!pointInPolygon(candidate, points)) {
          continue;
        }
        // Slightly prefer points near the middle, so a plain rectangle gets
        // its label dead center rather than anywhere along its spine.
        const centered =
          1 - 0.02 * (Math.abs(i / STEPS - 0.5) + Math.abs(j / STEPS - 0.5));
        const score = distanceToOutline(candidate, points) * centered;
        if (score > bestDistance) {
          bestDistance = score;
          best = candidate;
        }
      }
    }
  }

  visualCenters.set(points, best);
  return best;
}

const wallsCache = new WeakMap<readonly Corner[], Wall[]>();

/** The walls of a room: one per corner, running to the next corner. */
export function wallsOf(room: Pick<Room, "id" | "points">): Wall[] {
  const cached = wallsCache.get(room.points);
  if (cached) {
    return cached;
  }

  const clockwise = signedArea(room.points) >= 0;
  const walls = room.points.map((corner, index): Wall => {
    const next = room.points[(index + 1) % room.points.length];
    const a = { x: corner.x, y: corner.y };
    const b = { x: next.x, y: next.y };
    const length = distance(a, b);
    const dir = length === 0 ? { x: 1, y: 0 } : scale(sub(b, a), 1 / length);
    // The wall direction turned clockwise points into a clockwise room.
    const turned = { x: -dir.y, y: dir.x };
    return {
      id: corner.id,
      roomId: room.id,
      a,
      b,
      length,
      dir,
      angle: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
      inward: clockwise ? turned : scale(turned, -1),
      inwardSign: clockwise ? 1 : -1,
    };
  });

  wallsCache.set(room.points, walls);
  return walls;
}

export function findWall(
  rooms: ReadonlyMap<string, Room>,
  roomId: string,
  wallId: string
) {
  const room = rooms.get(roomId);
  return room ? wallsOf(room).find((wall) => wall.id === wallId) : undefined;
}

export type WallHit = {
  wall: Wall;
  // Distance along the wall from its start to the closest point.
  along: number;
  distance: number;
};

/** The wall closest to `point`, if any is within `maxDistance`. */
export function nearestWall(
  point: Point,
  rooms: Iterable<Room>,
  maxDistance: number
): WallHit | null {
  let best: WallHit | null = null;
  for (const room of rooms) {
    for (const wall of wallsOf(room)) {
      const hit = closestOnSegment(point, wall.a, wall.b);
      if (
        hit.distance <= maxDistance &&
        (!best || hit.distance < best.distance)
      ) {
        best = { wall, along: hit.t * wall.length, distance: hit.distance };
      }
    }
  }
  return best;
}

/**
 * Where an opening actually sits in its wall. The stored offset and width are
 * kept as the person set them; they're only fitted to the wall when drawn, so
 * a door isn't permanently squeezed when a wall is briefly dragged short.
 */
export function fitOpening(
  opening: Pick<Opening, "offset" | "width">,
  wall: Wall
) {
  const MARGIN = 4;
  const width = clamp(opening.width, 0, Math.max(0, wall.length - MARGIN * 2));
  const offset = clamp(
    opening.offset,
    width / 2 + MARGIN,
    Math.max(width / 2 + MARGIN, wall.length - width / 2 - MARGIN)
  );
  return {
    width,
    offset,
    center: add(wall.a, scale(wall.dir, offset)),
  };
}

/** Half the size of a rotated piece's axis-aligned bounding box. */
export function furnitureExtents(
  item: Pick<Furniture, "width" | "depth" | "rotation">
) {
  const radians = (item.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  return {
    x: (cos * item.width + sin * item.depth) / 2,
    y: (sin * item.width + cos * item.depth) / 2,
  };
}

/** The bounds of everything on the plan, for "zoom to fit". */
export function planBounds(
  rooms: Iterable<Room>,
  furniture: Iterable<Furniture>
) {
  const points: Point[] = [];
  for (const room of rooms) {
    points.push(...room.points);
  }
  for (const item of furniture) {
    const extents = furnitureExtents(item);
    points.push(
      { x: item.x - extents.x, y: item.y - extents.y },
      { x: item.x + extents.x, y: item.y + extents.y }
    );
  }
  return boundsOf(points);
}
