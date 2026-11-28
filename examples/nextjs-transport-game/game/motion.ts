import {
  CAR_COST,
  CAR_GAP,
  CAR_RUNNING_COST,
  DEFAULT_MODEL,
  type Model,
  MODELS,
  VEHICLE_LENGTH,
} from "./constants";
import type { Transport, Vehicle } from "./types";

export type PathPoint = {
  // Position in tile coordinates
  x: number;
  y: number;
  // Unit vector of the direction of travel
  dx: number;
  dy: number;
};

type Moving = Pick<
  Vehicle,
  "kind" | "model" | "path" | "status" | "from" | "departAt" | "limit"
>;

export function modelOf(vehicle: { kind: Transport; model: string }): Model {
  return (
    MODELS.find((model) => model.id === vehicle.model) ??
    MODELS.find((model) => model.id === DEFAULT_MODEL[vehicle.kind])!
  );
}

// What a vehicle of this model costs to buy, carries, and costs to run per
// tile. For a train that depends on how many carriages it has.
export function priceOf(model: Model, cars: number) {
  return model.kind === "rail" ? model.cost + cars * CAR_COST : model.cost;
}
export function capacityOf(model: Model, cars: number) {
  return model.kind === "rail" ? model.capacity * cars : model.capacity;
}
export function runningCostOf(model: Model, cars: number) {
  return model.kind === "rail"
    ? model.runningCost + cars * CAR_RUNNING_COST
    : model.runningCost;
}

// How far along its path the front of a vehicle is at a given time, in
// tiles. It set off from `from` at `departAt`, and stops at `limit` until
// it is given more.
export function headDistance(vehicle: Moving, time: number) {
  if (vehicle.status !== "run") {
    return vehicle.limit;
  }
  const elapsed = Math.max(0, time - vehicle.departAt) / 1000;
  return Math.min(
    vehicle.limit,
    vehicle.from + elapsed * modelOf(vehicle).speed
  );
}

// When a vehicle gets to `distance` along its path, if nothing stops it
export function timeAt(vehicle: Moving, distance: number) {
  return (
    vehicle.departAt +
    (Math.max(0, distance - vehicle.from) / modelOf(vehicle).speed) * 1000
  );
}

// How far a vehicle reaches in front of and behind the point it is at. The
// carriages of a train trail behind its engine.
export function reachOf(vehicle: Pick<Vehicle, "kind" | "cars">) {
  const half = VEHICLE_LENGTH[vehicle.kind] / 2;
  return {
    front: half,
    back: vehicle.kind === "rail" ? vehicle.cars * CAR_GAP + half : half,
  };
}

// The first and the last tile of its path that a vehicle is on, as indexes
// into `path`
export function tilesUnder(
  vehicle: Moving & Pick<Vehicle, "cars">,
  time: number
) {
  const { front, back } = reachOf(vehicle);
  const distance = headDistance(vehicle, time);
  return {
    first: Math.max(0, Math.floor(distance - back + 0.5)),
    last: Math.min(vehicle.path.length - 1, Math.floor(distance + front + 0.5)),
  };
}

// A new vehicle waits inside its depot, out of sight, and so does every
// part of it that hasn't come out yet
export function isInside(vehicle: Pick<Vehicle, "leg">, distance: number) {
  return vehicle.leg < 0 && distance < 0.5;
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

// Where a vehicle is at a given time, in tile coordinates
export function vehiclePoint(
  vehicle: Moving,
  size: number,
  time: number,
  out: PathPoint
): PathPoint {
  return pointOnPath(vehicle.path, size, headDistance(vehicle, time), out);
}

// How far a point of the map is from a vehicle, in tiles. A train is as
// close as the closest of its carriages. `scratch` is overwritten.
export function distanceToVehicle(
  vehicle: Moving & Pick<Vehicle, "cars">,
  size: number,
  time: number,
  x: number,
  y: number,
  scratch: PathPoint
) {
  const head = headDistance(vehicle, time);
  let nearest = Infinity;
  const cars = vehicle.kind === "rail" ? vehicle.cars : 0;
  for (let car = 0; car <= cars; car++) {
    pointOnPath(vehicle.path, size, Math.max(0, head - car * CAR_GAP), scratch);
    nearest = Math.min(nearest, Math.hypot(scratch.x - x, scratch.y - y));
  }
  return nearest;
}
