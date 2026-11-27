import { TRAIN_LENGTH, TRANSPORT } from "./constants";
import type { Vehicle } from "./types";

export type PathPoint = {
  // Position in tile coordinates
  x: number;
  y: number;
  // Unit vector of the direction of travel
  dx: number;
  dy: number;
};

export function travelMs(vehicle: Pick<Vehicle, "kind" | "path">) {
  return ((vehicle.path.length - 1) / TRANSPORT[vehicle.kind].speed) * 1000;
}

// When the vehicle next needs attention: either it reaches the end of its
// current leg, or (without a route) it is time to look for one again.
export function dueAt(vehicle: Pick<Vehicle, "kind" | "path" | "departAt">) {
  return vehicle.path.length >= 2
    ? vehicle.departAt + travelMs(vehicle)
    : vehicle.departAt;
}

// How far along its path the front of a vehicle is at a given time, in tiles.
// Trains start a leg with their whole length already on the path, so that the
// wagons trail behind the locomotive inside the station they are leaving.
export function headDistance(
  vehicle: Pick<Vehicle, "kind" | "path" | "departAt">,
  time: number
) {
  const length = vehicle.path.length - 1;
  if (length <= 0) {
    return 0;
  }
  const lead = vehicle.kind === "rail" ? Math.min(TRAIN_LENGTH, length) : 0;
  const elapsed = Math.max(0, time - vehicle.departAt) / 1000;
  return Math.min(length, lead + elapsed * TRANSPORT[vehicle.kind].speed);
}

// Point at `distance` tiles along a path of tiles. Vehicles go straight
// through tile centers and round the corners: inside a tile they follow a
// curve from the edge they entered by to the edge they leave by.
export function pointOnPath(
  path: readonly number[],
  size: number,
  distance: number,
  out: PathPoint
): PathPoint {
  const last = path.length - 1;
  const centerX = (index: number) => (path[index] % size) + 0.5;
  const centerY = (index: number) => Math.floor(path[index] / size) + 0.5;

  if (last <= 0) {
    out.x = path.length > 0 ? centerX(0) : 0;
    out.y = path.length > 0 ? centerY(0) : 0;
    out.dx = 1;
    out.dy = 0;
    return out;
  }

  const d = Math.max(0, Math.min(last, distance));

  if (d < 0.5 || d >= last - 0.5) {
    // First or last half-tile: a straight line from or to a tile center
    const a = d < 0.5 ? 0 : last - 1;
    const offset = d < 0.5 ? d : d - (last - 1);
    out.dx = centerX(a + 1) - centerX(a);
    out.dy = centerY(a + 1) - centerY(a);
    out.x = centerX(a) + out.dx * offset;
    out.y = centerY(a) + out.dy * offset;
    return out;
  }

  const index = Math.floor(d + 0.5);
  const u = d + 0.5 - index;
  const cx = centerX(index);
  const cy = centerY(index);
  const ax = (centerX(index - 1) + cx) / 2;
  const ay = (centerY(index - 1) + cy) / 2;
  const bx = (centerX(index + 1) + cx) / 2;
  const by = (centerY(index + 1) + cy) / 2;
  const v = 1 - u;

  out.x = v * v * ax + 2 * u * v * cx + u * u * bx;
  out.y = v * v * ay + 2 * u * v * cy + u * u * by;

  const tx = 2 * v * (cx - ax) + 2 * u * (bx - cx);
  const ty = 2 * v * (cy - ay) + 2 * u * (by - cy);
  const length = Math.hypot(tx, ty) || 1;
  out.dx = tx / length;
  out.dy = ty / length;
  return out;
}
