import { LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import {
  BUILDINGS,
  COMPANIES,
  MAX_VEHICLES_PER_COMPANY,
  TRANSPORT,
} from "./constants";
import {
  cargoBetween,
  companyBalance,
  nothingToCarry,
  suggestStationName,
  trackCost,
} from "./economy";
import { dueAt } from "./motion";
import { findPath, gridOf, type Network } from "./network";
import { advance } from "./simulation";
import { townGrowth, townStations } from "./towns";
import type {
  ActionResult,
  LineKind,
  StationData,
  Transport,
  Vehicle,
  VehicleData,
} from "./types";
import { isBlocked, WATER, type World } from "./world";

// Every change to the game goes through one of these functions. They take the
// root of Liveblocks Storage, so they can be called from `useMutation`.
type Root = LiveObject<Liveblocks["Storage"]>;

const MAX_TILES_PER_BUILD = 160;

const NO_WAY: Record<Transport, string> = {
  road: "No road connects these two stops",
  rail: "No railway connects these two stations",
  water: "These two docks aren't on the same stretch of water",
};

// Where in Storage each kind of line is kept
const LAYER: Record<LineKind, "roads" | "rails" | "canals"> = {
  road: "roads",
  rail: "rails",
  canal: "canals",
};

// What is built on a tile, regardless of where that information comes from
// (live Storage inside a mutation, or an immutable snapshot when previewing)
export type TileView = {
  hasRoad: (tile: number) => boolean;
  hasRail: (tile: number) => boolean;
  // Water that the map came with, or a canal
  isWater: (tile: number) => boolean;
  stationKind: (tile: number) => Transport | null;
};

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function liveView(root: Root, world: World): TileView {
  const roads = root.get("roads");
  const rails = root.get("rails");
  const canals = root.get("canals");
  const stations = root.get("stations");
  return {
    hasRoad: (tile) => world.townRoads[tile] === 1 || roads.has(String(tile)),
    hasRail: (tile) => rails.has(String(tile)),
    isWater: (tile) =>
      world.terrain[tile] === WATER || canals.has(String(tile)),
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
    isWater: (tile) => network.water[tile] === 1,
    stationKind: (tile) => stations.get(String(tile))?.kind ?? null,
  };
}

// Whether a tile already has this kind of line. Where there is water, there
// is no canal left to dig.
function hasTrack(view: TileView, kind: LineKind, tile: number) {
  if (kind === "canal") {
    return view.isWater(tile);
  }
  return kind === "road" ? view.hasRoad(tile) : view.hasRail(tile);
}

function liveBalance(root: Root, companyId: string) {
  const owned: { owner: string; earned: number }[] = [];
  for (const vehicle of root.get("vehicles").values()) {
    owned.push({ owner: vehicle.get("owner"), earned: vehicle.get("earned") });
  }
  return companyBalance(
    root.get("companies").get(companyId)?.toJSON(),
    owned,
    companyId
  );
}

function spend(root: Root, companyId: string, amount: number) {
  const company = root.get("companies").get(companyId);
  company?.set("spent", company.get("spent") + amount);
}

// Returns why a road, railway or canal can't go on a tile, or null if it
// can. Roads and railways can be built across a canal, and a canal can be
// dug under them: either way, the crossing becomes a bridge.
export function trackProblem(
  world: World,
  view: TileView,
  kind: LineKind,
  tile: number
) {
  if (hasTrack(view, kind, tile)) {
    return null;
  }
  if (isBlocked(world, tile)) {
    return "There's a building in the way";
  }
  const station = view.stationKind(tile);
  if (station && station !== kind) {
    return "There's a station in the way";
  }
  return null;
}

// Whether a tile touches land on one of its four sides
function isByTheShore(size: number, view: TileView, tile: number) {
  const x = tile % size;
  const y = Math.floor(tile / size);
  return (
    (x > 0 && !view.isWater(tile - 1)) ||
    (x < size - 1 && !view.isWater(tile + 1)) ||
    (y > 0 && !view.isWater(tile - size)) ||
    (y < size - 1 && !view.isWater(tile + size))
  );
}

export function stationProblem(
  world: World,
  view: TileView,
  kind: Transport,
  tile: number
) {
  if (isBlocked(world, tile)) {
    return "There's a building in the way";
  }
  if (view.stationKind(tile)) {
    return "There's already a station here";
  }
  if (kind === "water") {
    // Docks are the one thing that is built on the water
    if (!view.isWater(tile) || !isByTheShore(world.size, view, tile)) {
      return "Docks are built on the water, right by the shore";
    }
    return view.hasRoad(tile) || view.hasRail(tile)
      ? "There's a bridge in the way"
      : null;
  }
  if (view.isWater(tile)) {
    return "Stations can't be built on water";
  }
  if (kind === "road" ? view.hasRail(tile) : view.hasRoad(tile)) {
    return kind === "road"
      ? "There's a railway in the way"
      : "There's a road in the way";
  }
  return null;
}

// What laying track or digging a canal over these tiles would cost,
// skipping the tiles that already have some
export function trackPlan(
  world: World,
  view: TileView,
  kind: LineKind,
  tiles: number[]
) {
  let cost = 0;
  let problem: string | null = null;
  const missing: number[] = [];
  for (const tile of tiles) {
    problem = problem ?? trackProblem(world, view, kind, tile);
    if (!hasTrack(view, kind, tile)) {
      missing.push(tile);
      cost += trackCost(world, kind, tile, view.isWater(tile));
    }
  }
  return { cost, problem, missing };
}

export function stationCost(
  world: World,
  view: TileView,
  kind: Transport,
  tile: number
) {
  const { stationCost } = TRANSPORT[kind];
  return kind === "water" || hasTrack(view, kind, tile)
    ? stationCost
    : stationCost + trackCost(world, kind, tile, false);
}

// Founds a company the first time a player picks it. Later players who pick
// it take over what is already there.
export function ensureCompany(root: Root, companyId: string, now: number) {
  const companies = root.get("companies");
  const preset = COMPANIES.find((company) => company.id === companyId);
  if (preset && !companies.has(companyId)) {
    companies.set(
      companyId,
      new LiveObject({
        name: preset.name,
        color: preset.color,
        spent: 0,
        banked: 0,
        foundedAt: now,
      })
    );
  }
}

// The hidden cheat: free money
export function addMoney(root: Root, companyId: string, amount: number) {
  const company = root.get("companies").get(companyId);
  company?.set("banked", company.get("banked") + amount);
  return company !== undefined;
}

// What demolishing the building on this tile costs: more for bigger ones
function demolishCost(world: World, tile: number) {
  const house = world.houses[world.houseAt[tile]];
  return house ? BUILDINGS[house.variant].demolishCost : 0;
}

// What demolishing the buildings on these tiles would cost
export function demolitionCost(world: World, tiles: readonly number[]) {
  let cost = 0;
  for (const tile of tiles) {
    cost += demolishCost(world, tile);
  }
  return cost;
}

// How fast a town grows depends on the stations around it. A town keeps
// growing at the speed that was last saved for it, so when its number of
// stations changes (one is built, removed, or brought back with undo), how
// far it has grown until now is saved along with the new number, and it
// carries on from there. Every client does this when it sees the change:
// what they save is the same to within a few milliseconds of growth, so it
// doesn't matter whose write lands last. Returns whether anything was saved.
export function syncTownGrowth(root: Root, world: World, now: number) {
  const stations = [...root.get("stations").keys()].map(Number);
  const counts = townStations(world, stations);
  const towns = root.get("towns");
  let changed = false;
  for (const { id } of world.towns) {
    const saved = towns.get(String(id));
    if ((saved?.stations ?? 0) !== counts[id]) {
      towns.set(String(id), {
        steps: townGrowth(saved, root.get("startedAt"), now),
        at: now,
        stations: counts[id],
      });
      changed = true;
    }
  }
  return changed;
}

export function buildTrack(
  root: Root,
  world: World,
  companyId: string,
  kind: LineKind,
  tiles: number[]
): ActionResult {
  if (!root.get("companies").has(companyId)) {
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
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  const tracks = root.get(LAYER[kind]);
  for (const tile of missing) {
    tracks.set(String(tile), companyId);
  }
  spend(root, companyId, cost);
  return { ok: true, cost };
}

export function buildStation(
  root: Root,
  world: World,
  companyId: string,
  kind: Transport,
  tile: number,
  now: number
): ActionResult {
  if (!root.get("companies").has(companyId)) {
    return fail("Your company isn't ready yet");
  }

  const view = liveView(root, world);
  const problem = stationProblem(world, view, kind, tile);
  if (problem) {
    return fail(problem);
  }
  const cost = stationCost(world, view, kind, tile);
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  // A station is also a piece of track, so vehicles can drive through it
  const key = String(tile);
  if (kind !== "water" && !hasTrack(view, kind, tile)) {
    root.get(LAYER[kind]).set(key, companyId);
  }
  const taken = new Set<string>();
  for (const station of root.get("stations").values()) {
    taken.add(station.get("name"));
  }
  const name = suggestStationName(world, tile, taken, kind === "water");
  root.get("stations").set(
    key,
    new LiveObject<StationData>({
      owner: companyId,
      kind,
      name,
      builtAt: now,
      stock: {},
    })
  );
  spend(root, companyId, cost);
  return { ok: true, cost, message: name };
}

// Clears the given tiles: the company's own stations, tracks and canals are
// removed for free, and buildings are demolished for a price. One thing is
// removed per tile at a time: a station first, then the track it was on,
// and a bridge before the canal under it.
export function bulldoze(
  root: Root,
  world: World,
  companyId: string,
  tiles: number[]
): ActionResult {
  const roads = root.get("roads");
  const rails = root.get("rails");
  const canals = root.get("canals");
  const stations = root.get("stations");
  const vehicles = root.get("vehicles");
  const demolished = root.get("demolished");
  const company = root.get("companies").get(companyId);
  if (!company) {
    return fail("Your company isn't ready yet");
  }
  const balance = liveBalance(root, companyId);

  let removed = 0;
  let cost = 0;
  let problem = "Nothing to remove here";

  for (const tile of tiles.slice(0, MAX_TILES_PER_BUILD)) {
    const key = String(tile);
    const station = stations.get(key);

    if (world.houseAt[tile] >= 0) {
      if (demolished.has(key)) {
        continue;
      }
      const price = demolishCost(world, tile);
      if (cost + price > balance) {
        problem = "Not enough money";
        continue;
      }
      demolished.set(key, companyId);
      cost += price;
      removed++;
    } else if (world.industryAt[tile] >= 0) {
      problem = "Industries can't be demolished";
    } else if (station) {
      if (station.get("owner") !== companyId) {
        problem = "That belongs to another company";
        continue;
      }
      // Vehicles serving this station have nowhere to go: sell them
      for (const [id, vehicle] of [...vehicles.entries()]) {
        if (vehicle.get("stops").includes(key)) {
          company.set("banked", company.get("banked") + vehicle.get("earned"));
          vehicles.delete(id);
        }
      }
      stations.delete(key);
      removed++;
    } else {
      const mine = [rails, roads, canals].find(
        (layer) => layer.get(key) === companyId
      );
      if (mine) {
        mine.delete(key);
        removed++;
      } else if (rails.has(key) || roads.has(key) || canals.has(key)) {
        problem = "That belongs to another company";
      } else if (world.townRoads[tile]) {
        problem = "Town streets can't be removed";
      }
    }
  }

  if (cost > 0) {
    spend(root, companyId, cost);
  }
  return removed > 0 ? { ok: true, cost } : fail(problem);
}

export function buyVehicle(
  root: Root,
  world: World,
  network: Network,
  companyId: string,
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

  if (!root.get("companies").has(companyId)) {
    return fail("Your company isn't ready yet");
  }
  if (!from || !to || fromTile === toTile) {
    return fail("Pick two different stations");
  }
  if (from.get("owner") !== companyId || to.get("owner") !== companyId) {
    return fail("Vehicles can only stop at your own stations");
  }
  const kind = from.get("kind");
  if (to.get("kind") !== kind) {
    return fail("Both stations must be of the same type");
  }
  if (!findPath(gridOf(network, kind), world.size, fromTile, toTile)) {
    return fail(NO_WAY[kind]);
  }

  // A vehicle with nothing to carry would only cost money
  const cargo = [
    ...cargoBetween(world, fromTile, toTile),
    ...cargoBetween(world, toTile, fromTile),
  ];
  if (cargo.length === 0) {
    return fail(
      nothingToCarry(
        world,
        { tile: fromTile, name: from.get("name") },
        { tile: toTile, name: to.get("name") }
      )
    );
  }

  let owned = 0;
  for (const vehicle of vehicles.values()) {
    if (vehicle.get("owner") === companyId) {
      owned++;
    }
  }
  if (owned >= MAX_VEHICLES_PER_COMPANY) {
    return fail(`You can't own more than ${MAX_VEHICLES_PER_COMPANY} vehicles`);
  }

  const cost = TRANSPORT[kind].vehicleCost;
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  vehicles.set(
    nanoid(),
    new LiveObject<VehicleData>({
      owner: companyId,
      kind,
      stops: [fromKey, toKey],
      leg: 0,
      // No path yet: the simulation plans the first leg right away
      path: [],
      departAt: now,
      load: {},
      earned: 0,
      lastIncome: 0,
      trips: 0,
    })
  );
  spend(root, companyId, cost);
  return {
    ok: true,
    cost,
    message: `${from.get("name")} → ${to.get("name")}`,
  };
}

export function cloneVehicle(
  root: Root,
  world: World,
  network: Network,
  companyId: string,
  vehicleId: string,
  now: number
): ActionResult {
  const vehicle = root.get("vehicles").get(vehicleId);
  if (!vehicle || vehicle.get("owner") !== companyId) {
    return fail("That vehicle isn't yours");
  }
  const [from, to] = vehicle.get("stops");
  return buyVehicle(
    root,
    world,
    network,
    companyId,
    Number(from),
    Number(to),
    now
  );
}

export function sellVehicle(
  root: Root,
  companyId: string,
  vehicleId: string
): ActionResult {
  const vehicles = root.get("vehicles");
  const vehicle = vehicles.get(vehicleId);
  const company = root.get("companies").get(companyId);
  if (!vehicle || !company || vehicle.get("owner") !== companyId) {
    return fail("That vehicle isn't yours");
  }

  // Keep what the vehicle earned, and get half of its price back
  const refund = Math.round(TRANSPORT[vehicle.get("kind")].vehicleCost / 2);
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
    root
      .get("vehicles")
      .get(id)
      ?.update({
        leg: vehicle.leg,
        path: [...vehicle.path],
        departAt: vehicle.departAt,
        load: { ...vehicle.load },
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
export function resetGame(root: Root, seed: number, size: number, now: number) {
  root.update({
    seed,
    size,
    startedAt: now,
    towns: new LiveMap(),
    demolished: new LiveMap(),
    roads: new LiveMap(),
    rails: new LiveMap(),
    canals: new LiveMap(),
    stations: new LiveMap(),
    vehicles: new LiveMap(),
    companies: new LiveMap(),
  });
}
