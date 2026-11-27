import { LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import { MAX_VEHICLES_PER_COMPANY, TRACK } from "./constants";
import {
  cargoBetween,
  companyBalance,
  suggestStationName,
  trackCost,
} from "./economy";
import { dueAt } from "./motion";
import { findPath, gridOf, type Network } from "./network";
import { advance } from "./simulation";
import type {
  ActionResult,
  StationData,
  TrackKind,
  Vehicle,
  VehicleData,
} from "./types";
import { isBlocked, WATER, type World } from "./world";

// Every change to the game goes through one of these functions. They take the
// root of Liveblocks Storage, so they can be called from `useMutation`.
type Root = LiveObject<Liveblocks["Storage"]>;

const MAX_TILES_PER_BUILD = 160;

// What is built on a tile, regardless of where that information comes from
// (live Storage inside a mutation, or an immutable snapshot when previewing)
export type TileView = {
  hasRoad: (tile: number) => boolean;
  hasRail: (tile: number) => boolean;
  stationKind: (tile: number) => TrackKind | null;
};

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function liveView(root: Root, world: World): TileView {
  const roads = root.get("roads");
  const rails = root.get("rails");
  const stations = root.get("stations");
  return {
    hasRoad: (tile) => world.townRoads[tile] === 1 || roads.has(String(tile)),
    hasRail: (tile) => rails.has(String(tile)),
    stationKind: (tile) => stations.get(String(tile))?.get("kind") ?? null,
  };
}

// The same view, over the immutable snapshots that `useStorage` returns
export function snapshotView(
  network: Network,
  stations: ReadonlyMap<string, Pick<StationData, "kind">>
): TileView {
  return {
    hasRoad: (tile) => network.road[tile] === 1,
    hasRail: (tile) => network.rail[tile] === 1,
    stationKind: (tile) => stations.get(String(tile))?.kind ?? null,
  };
}

function hasTrack(view: TileView, kind: TrackKind, tile: number) {
  return kind === "road" ? view.hasRoad(tile) : view.hasRail(tile);
}

function liveBalance(root: Root, userId: string) {
  const owned: { owner: string; earned: number }[] = [];
  for (const vehicle of root.get("vehicles").values()) {
    owned.push({ owner: vehicle.get("owner"), earned: vehicle.get("earned") });
  }
  return companyBalance(
    root.get("companies").get(userId)?.toJSON(),
    owned,
    userId
  );
}

function spend(root: Root, userId: string, amount: number) {
  const company = root.get("companies").get(userId);
  company?.set("spent", company.get("spent") + amount);
}

// Returns why a road or railway can't go on a tile, or null if it can
export function trackProblem(
  world: World,
  view: TileView,
  kind: TrackKind,
  tile: number
) {
  if (isBlocked(world, tile)) {
    return "There's a building in the way";
  }
  const station = view.stationKind(tile);
  if (station && station !== kind) {
    return "There's a station in the way";
  }
  return null;
}

export function stationProblem(
  world: World,
  view: TileView,
  kind: TrackKind,
  tile: number
) {
  if (isBlocked(world, tile)) {
    return "There's a building in the way";
  }
  if (world.terrain[tile] === WATER) {
    return "Stations can't be built on water";
  }
  if (view.stationKind(tile)) {
    return "There's already a station here";
  }
  if (kind === "road" ? view.hasRail(tile) : view.hasRoad(tile)) {
    return kind === "road"
      ? "There's a railway in the way"
      : "There's a road in the way";
  }
  return null;
}

// What laying track over these tiles would cost, skipping the tiles that
// already have some
export function trackPlan(
  world: World,
  view: TileView,
  kind: TrackKind,
  tiles: number[]
) {
  let cost = 0;
  let problem: string | null = null;
  const missing: number[] = [];
  for (const tile of tiles) {
    problem = problem ?? trackProblem(world, view, kind, tile);
    if (!hasTrack(view, kind, tile)) {
      missing.push(tile);
      cost += trackCost(world, kind, tile);
    }
  }
  return { cost, problem, missing };
}

export function stationCost(
  world: World,
  view: TileView,
  kind: TrackKind,
  tile: number
) {
  return (
    TRACK[kind].stationCost +
    (hasTrack(view, kind, tile) ? 0 : trackCost(world, kind, tile))
  );
}

export function ensureCompany(
  root: Root,
  userId: string,
  info: { name: string; color: string },
  now: number
) {
  const companies = root.get("companies");
  if (!companies.has(userId)) {
    companies.set(
      userId,
      new LiveObject({
        name: `${info.name.split(" ")[0]} Transport`,
        color: info.color,
        spent: 0,
        banked: 0,
        foundedAt: now,
      })
    );
  }
}

export function buildTrack(
  root: Root,
  world: World,
  userId: string,
  kind: TrackKind,
  tiles: number[]
): ActionResult {
  if (!root.get("companies").has(userId)) {
    return fail("Your company isn't ready yet");
  }
  if (tiles.length > MAX_TILES_PER_BUILD) {
    return fail("That's too long to build in one go");
  }

  const { cost, problem, missing } = trackPlan(
    world,
    liveView(root, world),
    kind,
    tiles
  );
  if (problem) {
    return fail(problem);
  }
  if (cost > liveBalance(root, userId)) {
    return fail("Not enough money");
  }

  const tracks = root.get(kind === "road" ? "roads" : "rails");
  for (const tile of missing) {
    tracks.set(String(tile), userId);
  }
  spend(root, userId, cost);
  return { ok: true, cost };
}

export function buildStation(
  root: Root,
  world: World,
  userId: string,
  kind: TrackKind,
  tile: number,
  now: number
): ActionResult {
  if (!root.get("companies").has(userId)) {
    return fail("Your company isn't ready yet");
  }

  const view = liveView(root, world);
  const problem = stationProblem(world, view, kind, tile);
  if (problem) {
    return fail(problem);
  }
  const cost = stationCost(world, view, kind, tile);
  if (cost > liveBalance(root, userId)) {
    return fail("Not enough money");
  }

  // A station is also a piece of track, so vehicles can drive through it
  const key = String(tile);
  if (!hasTrack(view, kind, tile)) {
    root.get(kind === "road" ? "roads" : "rails").set(key, userId);
  }
  const name = suggestStationName(world, tile);
  root.get("stations").set(
    key,
    new LiveObject<StationData>({
      owner: userId,
      kind,
      name,
      builtAt: now,
      stock: {},
    })
  );
  spend(root, userId, cost);
  return { ok: true, cost, message: name };
}

// Removes the player's own stations and tracks from the given tiles. A tile
// with a station loses the station first, and its track on a second pass.
export function bulldoze(
  root: Root,
  world: World,
  userId: string,
  tiles: number[]
): ActionResult {
  const roads = root.get("roads");
  const rails = root.get("rails");
  const stations = root.get("stations");
  const vehicles = root.get("vehicles");
  const company = root.get("companies").get(userId);

  let removed = 0;
  let problem = "Nothing to remove here";

  for (const tile of tiles.slice(0, MAX_TILES_PER_BUILD)) {
    const key = String(tile);
    const station = stations.get(key);

    if (station) {
      if (station.get("owner") !== userId) {
        problem = "That belongs to another company";
        continue;
      }
      // Vehicles serving this station have nowhere to go: sell them
      for (const [id, vehicle] of [...vehicles.entries()]) {
        if (vehicle.get("stops").includes(key)) {
          company?.set("banked", company.get("banked") + vehicle.get("earned"));
          vehicles.delete(id);
        }
      }
      stations.delete(key);
      removed++;
    } else if (rails.has(key) || roads.has(key)) {
      const tracks = rails.get(key) === userId ? rails : roads;
      if (tracks.get(key) !== userId) {
        problem = "That belongs to another company";
        continue;
      }
      tracks.delete(key);
      removed++;
    } else if (world.townRoads[tile]) {
      problem = "Town streets can't be removed";
    }
  }

  return removed > 0 ? { ok: true, cost: 0 } : fail(problem);
}

export function buyVehicle(
  root: Root,
  world: World,
  network: Network,
  userId: string,
  fromTile: number,
  toTile: number,
  now: number
): ActionResult {
  const stations = root.get("stations");
  const vehicles = root.get("vehicles");
  const fromKey = String(fromTile);
  const toKey = String(toTile);
  const from = stations.get(fromKey);
  const to = stations.get(toKey);

  if (!root.get("companies").has(userId)) {
    return fail("Your company isn't ready yet");
  }
  if (!from || !to || fromTile === toTile) {
    return fail("Pick two different stations");
  }
  if (from.get("owner") !== userId || to.get("owner") !== userId) {
    return fail("Vehicles can only stop at your own stations");
  }
  const kind = from.get("kind");
  if (to.get("kind") !== kind) {
    return fail("Both stations must be of the same type");
  }
  if (!findPath(gridOf(network, kind), world.size, fromTile, toTile)) {
    return fail(
      kind === "road"
        ? "No road connects these two stops"
        : "No railway connects these two stations"
    );
  }

  let owned = 0;
  for (const vehicle of vehicles.values()) {
    if (vehicle.get("owner") === userId) {
      owned++;
    }
  }
  if (owned >= MAX_VEHICLES_PER_COMPANY) {
    return fail(`You can't own more than ${MAX_VEHICLES_PER_COMPANY} vehicles`);
  }

  const cost = TRACK[kind].vehicleCost;
  if (cost > liveBalance(root, userId)) {
    return fail("Not enough money");
  }

  vehicles.set(
    nanoid(),
    new LiveObject<VehicleData>({
      owner: userId,
      kind,
      stops: [fromKey, toKey],
      leg: 0,
      // No path yet: the simulation plans the first leg right away
      path: [],
      departAt: now,
      cargo: null,
      load: 0,
      earned: 0,
      lastIncome: 0,
      trips: 0,
    })
  );
  spend(root, userId, cost);

  const cargo = [
    ...cargoBetween(world, fromTile, toTile),
    ...cargoBetween(world, toTile, fromTile),
  ];
  return {
    ok: true,
    cost,
    message:
      cargo.length > 0
        ? `${from.get("name")} → ${to.get("name")}`
        : "Nothing to carry between these two stations",
  };
}

export function cloneVehicle(
  root: Root,
  world: World,
  network: Network,
  userId: string,
  vehicleId: string,
  now: number
): ActionResult {
  const vehicle = root.get("vehicles").get(vehicleId);
  if (!vehicle || vehicle.get("owner") !== userId) {
    return fail("That vehicle isn't yours");
  }
  const [from, to] = vehicle.get("stops");
  return buyVehicle(root, world, network, userId, Number(from), Number(to), now);
}

export function sellVehicle(
  root: Root,
  userId: string,
  vehicleId: string
): ActionResult {
  const vehicles = root.get("vehicles");
  const vehicle = vehicles.get(vehicleId);
  const company = root.get("companies").get(userId);
  if (!vehicle || !company || vehicle.get("owner") !== userId) {
    return fail("That vehicle isn't yours");
  }

  // Keep what the vehicle earned, and get half of its price back
  const refund = Math.round(TRACK[vehicle.get("kind")].vehicleCost / 2);
  company.update({
    banked: company.get("banked") + vehicle.get("earned"),
    spent: company.get("spent") - refund,
  });
  vehicles.delete(vehicleId);
  return { ok: true, cost: -refund };
}

// Moves along every vehicle accepted by `shouldRun` that has reached the end
// of its current leg. Returns how many vehicles were updated.
export function runSimulation(
  root: Root,
  world: World,
  network: Network,
  now: number,
  shouldRun: (vehicle: Vehicle) => boolean
) {
  const vehicles = new Map<string, Vehicle>();
  let anyDue = false;
  for (const [id, live] of root.get("vehicles").entries()) {
    const vehicle = live.toJSON();
    if (shouldRun(vehicle)) {
      vehicles.set(id, vehicle);
      anyDue = anyDue || dueAt(vehicle) <= now;
    }
  }
  if (!anyDue) {
    return 0;
  }

  const stations = new Map<string, StationData>();
  for (const [key, live] of root.get("stations").entries()) {
    stations.set(key, live.toJSON());
  }

  const result = advance(world, network, vehicles, stations, now);
  for (const [id, vehicle] of result.vehicles) {
    // Only the fields that change from one leg to the next
    root.get("vehicles").get(id)?.update({
      leg: vehicle.leg,
      path: [...vehicle.path],
      departAt: vehicle.departAt,
      cargo: vehicle.cargo,
      load: vehicle.load,
      earned: vehicle.earned,
      lastIncome: vehicle.lastIncome,
      trips: vehicle.trips,
    });
  }
  for (const [key, stock] of result.stocks) {
    root.get("stations").get(key)?.set("stock", stock);
  }
  return result.vehicles.size;
}

// Wipes everything players have built and starts over on a new map
export function resetGame(root: Root, seed: number) {
  root.update({
    seed,
    roads: new LiveMap(),
    rails: new LiveMap(),
    stations: new LiveMap(),
    vehicles: new LiveMap(),
    companies: new LiveMap(),
  });
}
