import { LiveMap, LiveObject } from "@liveblocks/client";
import { nanoid } from "nanoid";
import type { MapOptions } from "./climate";
import {
  type Clock,
  gameTime,
  type Speed,
  storedClock,
  withSpeed,
} from "./clock";
import {
  BUILDINGS,
  COMPANIES,
  DEFAULT_CARS,
  DEFAULT_MODEL,
  MAX_VEHICLES_PER_COMPANY,
  MODELS,
  SIGNALS,
  STATS_PERIOD_MS,
  STATS_SAMPLES,
  STORAGE_VERSION,
  STREET_REMOVAL_COST,
  TRANSPORT,
  TREE_CLEAR_COST,
} from "./constants";
import {
  cargoBetween,
  companyBalance,
  nothingToCarry,
  suggestStationName,
  tileDistance,
  trackCost,
} from "./economy";
import { modelOf, priceOf } from "./motion";
import {
  countSides,
  EAST,
  findPath,
  findRailPath,
  gridOf,
  isStraight,
  neighbor,
  type Network,
  NORTH,
  opposite,
  SIDES,
  sideToward,
  SOUTH,
  WEST,
} from "./network";
import { advance, type SimulationMemory } from "./simulation";
import {
  groupStations,
  isPlatformEnd,
  type Station,
  type Stations,
} from "./stations";
import { servedStations, townStations, townStats, townSteps } from "./towns";
import type {
  ActionResult,
  DepotData,
  LineKind,
  SignalKind,
  StationData,
  StatsSample,
  Transport,
  Vehicle,
  VehicleData,
} from "./types";
import { buildingTiles, isBlocked, WATER, type World } from "./world";

// Every change to the game goes through one of these functions. They take the
// root of Liveblocks Storage, so they can be called from `useMutation`.
type Root = LiveObject<Liveblocks["Storage"]>;

export function clockOf(root: Root): Clock {
  return storedClock({
    clock: root.get("clock"),
    pausedAt: root.get("pausedAt"),
    pausedFor: root.get("pausedFor"),
  });
}

// What time it is in the game, for the `now` that actions are given
export function timeOf(root: Root, wallTime: number) {
  return gameTime(clockOf(root), wallTime);
}

// Pauses the game for everyone, lets it run, or fast-forwards it. While it
// is paused the game clock stands still, so vehicles stop where they are, no
// cargo piles up and towns don't grow. Players can still build.
export function setSpeed(root: Root, speed: Speed, wallTime: number) {
  const clock = clockOf(root);
  const next = withSpeed(clock, speed, wallTime);
  if (next.speed !== clock.speed || !root.get("clock")) {
    root.set("clock", next);
  }
}

const MAX_TILES_PER_BUILD = 160;

const NO_WAY: Record<Transport, string> = {
  road: "No road connects these two stops",
  rail: "No railway connects these two stations",
  water: "These two docks aren't on the same stretch of water",
};

// Where a depot has to stand
const DEPOT_PLACE: Record<Transport, string> = {
  road: "A garage is built on open land, right next to a road",
  rail: "An engine shed is built on open land, right next to a piece of your railway",
  water: "A shipyard is built on the shore, right next to the water",
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
  stationOwner: (tile: number) => string | null;
  hasDepot: (tile: number) => boolean;
  hasSignal: (tile: number) => boolean;
  // The sides of a railway tile that its track runs to, as direction bits
  links: (tile: number) => number;
};

function fail(message: string): ActionResult {
  return { ok: false, message };
}

function liveView(root: Root, world: World): TileView {
  const { size } = world;
  const roads = root.get("roads");
  const rails = root.get("rails");
  const canals = root.get("canals");
  const stations = root.get("stations");
  const depots = root.get("depots");
  const signals = root.get("signals");
  const railLinks = root.get("railLinks");
  return {
    hasRoad: (tile) => world.townRoads[tile] === 1 || roads.has(String(tile)),
    hasRail: (tile) => rails.has(String(tile)),
    isWater: (tile) =>
      world.terrain[tile] === WATER || canals.has(String(tile)),
    stationKind: (tile) => stations.get(String(tile))?.get("kind") ?? null,
    stationOwner: (tile) => stations.get(String(tile))?.get("owner") ?? null,
    hasDepot: (tile) => depots.has(String(tile)),
    hasSignal: (tile) => signals.has(String(tile)),
    links: (tile) => {
      const own = rails.has(String(tile))
        ? (railLinks.get(String(tile)) ?? 0)
        : 0;
      let mask = 0;
      for (const side of SIDES) {
        const other = String(neighbor(size, tile, side));
        if (
          own & side &&
          rails.has(other) &&
          (railLinks.get(other) ?? 0) & opposite(side)
        ) {
          mask |= side;
        }
      }
      return mask;
    },
  };
}

// The same view, over the immutable snapshots that `useStorage` returns
export function snapshotView(
  network: Network,
  stations: ReadonlyMap<string, Pick<StationData, "kind" | "owner">>
): TileView {
  return {
    hasRoad: (tile) => network.road[tile] === 1,
    hasRail: (tile) => network.rail[tile] === 1,
    isWater: (tile) => network.water[tile] === 1,
    stationKind: (tile) => stations.get(String(tile))?.kind ?? null,
    stationOwner: (tile) => stations.get(String(tile))?.owner ?? null,
    hasDepot: (tile) => network.depots.has(tile),
    hasSignal: (tile) => network.signals.has(tile),
    links: (tile) => network.links[tile],
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

function liveStations(root: Root, size: number): Stations {
  return groupStations(
    new Map(Object.entries(root.get("stations").toJSON())),
    size
  );
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
  if (view.hasDepot(tile)) {
    return "There's a depot in the way";
  }
  const station = view.stationKind(tile);
  if (station && station !== kind) {
    return "There's a station in the way";
  }
  return null;
}

// Railways only join up where they are built to. Laying track from one tile
// to the next joins the two: these are the sides that each tile of a line
// gets joined on.
function linksAlong(size: number, tiles: readonly number[]) {
  const added = new Map<number, number>();
  for (let index = 1; index < tiles.length; index++) {
    const side = sideToward(size, tiles[index - 1], tiles[index]);
    added.set(tiles[index - 1], (added.get(tiles[index - 1]) ?? 0) | side);
    added.set(tiles[index], (added.get(tiles[index]) ?? 0) | opposite(side));
  }
  return added;
}

// Whether a tile touches land on one of its four sides
function isByTheShore(size: number, view: TileView, tile: number) {
  return SIDES.some((side) => {
    const other = neighbor(size, tile, side);
    return other >= 0 && !view.isWater(other);
  });
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
  if (view.hasDepot(tile)) {
    return "There's a depot in the way";
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
  if (kind === "rail" && view.hasSignal(tile)) {
    return "There's a signal in the way";
  }
  return null;
}

// What laying track or digging a canal over these tiles would cost,
// skipping the tiles that already have some. For a railway, also which
// tiles it joins up.
export function trackPlan(
  world: World,
  view: TileView,
  kind: LineKind,
  tiles: readonly number[]
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
  const links =
    kind === "rail" ? linksAlong(world.size, tiles) : new Map<number, number>();
  for (const [tile, mask] of links) {
    if (
      view.stationKind(tile) === "rail" &&
      !isStraight(view.links(tile) | mask)
    ) {
      problem = problem ?? "Track only runs straight through a station";
    }
  }
  return { cost, problem, missing, links };
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

const EAST_WEST = [EAST, WEST];
const NORTH_SOUTH = [NORTH, SOUTH];

// What building a station over these tiles would cost. A road stop and a
// dock are one tile. A train station is a platform, as long as the line that
// was dragged: the tiles that are already part of the company's own station
// are skipped, so a platform can be made longer by dragging over it.
export function stationPlan(
  world: World,
  view: TileView,
  kind: Transport,
  tiles: readonly number[],
  companyId: string | null
) {
  const { size } = world;
  let cost = 0;
  let problem: string | null = null;
  const build: number[] = [];
  for (const tile of tiles) {
    if (
      tiles.length > 1 &&
      view.stationKind(tile) === kind &&
      view.stationOwner(tile) === companyId
    ) {
      continue;
    }
    problem = problem ?? stationProblem(world, view, kind, tile);
    build.push(tile);
    cost += stationCost(world, view, kind, tile);
  }

  const links =
    kind === "rail" ? linksAlong(size, tiles) : new Map<number, number>();
  if (kind === "rail" && tiles.length === 1 && !view.hasRail(tiles[0])) {
    // A single new tile joins onto a platform of the company that ends
    // right next to it, which makes that platform longer
    for (const axis of [EAST_WEST, NORTH_SOUTH]) {
      for (const side of axis) {
        const other = neighbor(size, tiles[0], side);
        if (
          other >= 0 &&
          view.stationKind(other) === "rail" &&
          view.stationOwner(other) === companyId &&
          isStraight(view.links(other) | opposite(side))
        ) {
          links.set(tiles[0], (links.get(tiles[0]) ?? 0) | side);
          links.set(other, opposite(side));
        }
      }
      if (links.size > 0) {
        break;
      }
    }
  }
  if (kind === "rail") {
    for (const tile of tiles) {
      if (!isStraight(view.links(tile) | (links.get(tile) ?? 0))) {
        problem = problem ?? "A platform needs a straight piece of track";
      }
    }
  }
  return { cost, problem, build, links };
}

// The sides of a tile that a depot on it could let its vehicles out by:
// onto a road, a railway that isn't a station, or the water
export function depotSides(
  world: World,
  view: TileView,
  kind: Transport,
  tile: number
) {
  return SIDES.filter((side) => {
    const other = neighbor(world.size, tile, side);
    if (other < 0) {
      return false;
    }
    if (kind === "road") {
      return view.hasRoad(other);
    }
    if (kind === "rail") {
      return view.hasRail(other) && view.stationKind(other) === null;
    }
    return view.isWater(other) && !view.hasRoad(other) && !view.hasRail(other);
  });
}

export function depotProblem(
  world: World,
  view: TileView,
  kind: Transport,
  tile: number
) {
  if (isBlocked(world, tile)) {
    return "There's a building in the way";
  }
  if (view.hasDepot(tile)) {
    return "There's already a depot here";
  }
  if (view.stationKind(tile)) {
    return "There's a station in the way";
  }
  if (view.isWater(tile) || view.hasRoad(tile) || view.hasRail(tile)) {
    return DEPOT_PLACE[kind];
  }
  return depotSides(world, view, kind, tile).length > 0
    ? null
    : DEPOT_PLACE[kind];
}

export function depotCost(world: World, kind: Transport, tile: number) {
  return TRANSPORT[kind].depotCost + world.trees[tile] * TREE_CLEAR_COST;
}

// Signals stand beside plain track: a piece that runs to exactly two sides
export function signalProblem(view: TileView, tile: number) {
  if (!view.hasRail(tile)) {
    return "Signals stand beside a railway";
  }
  if (view.stationKind(tile)) {
    return "Signals can't stand in a station";
  }
  return countSides(view.links(tile)) === 2
    ? null
    : "Signals stand beside plain track: not at a junction, and not at the end of a line";
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

// Whether the bulldozer would take a town's street off this tile. A station
// or a railway on it goes first.
function hasLooseStreet(world: World, view: TileView, tile: number) {
  return (
    world.townRoads[tile] === 1 &&
    !view.hasRail(tile) &&
    view.stationKind(tile) === null
  );
}

// What clearing these tiles of what a town built on them would cost: its
// buildings and its streets. A building that covers several of the tiles is
// only paid for once.
export function clearingCost(
  world: World,
  view: TileView,
  tiles: readonly number[]
) {
  const buildings = new Set(tiles.map((tile) => world.houseAt[tile]));
  let cost = 0;
  for (const index of buildings) {
    cost +=
      index >= 0 ? BUILDINGS[world.houses[index].variant].demolishCost : 0;
  }
  for (const tile of tiles) {
    if (world.houseAt[tile] < 0 && hasLooseStreet(world, view, tile)) {
      cost += STREET_REMOVAL_COST;
    }
  }
  return cost;
}

// How fast a town grows depends on how many of its stations vehicles call
// at. A town keeps growing at the speed that was last saved for it, so when
// that number changes (a vehicle is bought or sold, loses its way, or comes
// back with undo), how far the town has grown until now is saved along with
// the new number, and it carries on from there. Every client does this when
// it sees the change: what they save is the same to within a few
// milliseconds of growth, so it doesn't matter whose write lands last.
// Returns whether anything was saved.
export function syncTownGrowth(root: Root, world: World, now: number) {
  const vehicles = [...root.get("vehicles").values()].map((vehicle) => ({
    stops: vehicle.get("stops"),
    status: vehicle.get("status"),
  }));
  const counts = townStations(
    world,
    servedStations(vehicles, liveStations(root, world.size))
  );
  const towns = root.get("towns");
  let changed = false;
  for (const { id } of world.towns) {
    const saved = towns.get(String(id));
    if ((saved?.stations ?? 0) !== counts[id]) {
      towns.set(String(id), {
        steps: townSteps(world, id, saved, now),
        at: now,
        stations: counts[id],
      });
      changed = true;
    }
  }
  return changed;
}

function joinRails(root: Root, links: ReadonlyMap<number, number>) {
  const railLinks = root.get("railLinks");
  for (const [tile, mask] of links) {
    const before = railLinks.get(String(tile)) ?? 0;
    if ((before | mask) !== before) {
      railLinks.set(String(tile), before | mask);
    }
  }
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

  const { cost, problem, missing, links } = trackPlan(
    world,
    liveView(root, world),
    kind,
    tiles
  );
  if (problem) {
    return fail(problem);
  }
  const tracks = root.get(LAYER[kind]);
  // Joining tracks up changes where trains can go: only on your own
  if (
    kind === "rail" &&
    [...links.keys()].some(
      (tile) => (tracks.get(String(tile)) ?? companyId) !== companyId
    )
  ) {
    return fail("That railway belongs to another company");
  }
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  for (const tile of missing) {
    tracks.set(String(tile), companyId);
  }
  joinRails(root, links);
  spend(root, companyId, cost);
  return { ok: true, cost };
}

export function buildStation(
  root: Root,
  world: World,
  companyId: string,
  kind: Transport,
  tiles: number[],
  now: number
): ActionResult {
  if (!root.get("companies").has(companyId)) {
    return fail("Your company isn't ready yet");
  }
  if (tiles.length > MAX_TILES_PER_BUILD) {
    return fail("That's too long to build in one go");
  }

  const { size } = world;
  const view = liveView(root, world);
  const { cost, problem, build, links } = stationPlan(
    world,
    view,
    kind,
    tiles,
    companyId
  );
  if (problem) {
    return fail(problem);
  }
  if (build.length === 0) {
    return fail("There's already a station here");
  }
  if (
    kind === "rail" &&
    [...links.keys(), ...build].some(
      (tile) => (root.get("rails").get(String(tile)) ?? companyId) !== companyId
    )
  ) {
    return fail("That railway belongs to another company");
  }
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  // More tiles next to a station of the same company make that station
  // bigger: they go by its name
  const stations = root.get("stations");
  let name: string | undefined;
  const taken = new Set<string>();
  for (const station of stations.values()) {
    taken.add(station.get("name"));
  }
  for (const tile of build) {
    for (const side of SIDES) {
      const other = stations.get(String(neighbor(size, tile, side)));
      if (other?.get("owner") === companyId && other.get("kind") === kind) {
        name = name ?? other.get("name");
      }
    }
  }
  const isNew = name === undefined;
  name = name ?? suggestStationName(world, build[0], taken, kind === "water");

  for (const tile of build) {
    // A station is also a piece of track, so vehicles can drive through it
    const key = String(tile);
    if (kind !== "water" && !hasTrack(view, kind, tile)) {
      root.get(LAYER[kind]).set(key, companyId);
    }
    stations.set(
      key,
      new LiveObject<StationData>({
        owner: companyId,
        kind,
        name,
        builtAt: now,
        stock: {},
      })
    );
  }
  joinRails(root, links);
  spend(root, companyId, cost);
  return { ok: true, cost, message: isNew ? name : undefined };
}

// Builds a depot, facing the first road, railway or water around it. Using
// the tool on a depot again turns it to face the next one.
export function buildDepot(
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
  const key = String(tile);
  const depots = root.get("depots");
  const view = liveView(root, world);
  const sides = depotSides(world, view, kind, tile).filter(
    (side) =>
      kind !== "rail" ||
      root.get("rails").get(String(neighbor(world.size, tile, side))) ===
        companyId
  );

  const existing = depots.get(key);
  if (existing) {
    if (existing.owner !== companyId || existing.kind !== kind) {
      return fail("There's already a depot here");
    }
    const next = sides[(sides.indexOf(existing.side) + 1) % sides.length];
    if (next === undefined || next === existing.side) {
      return fail("There's nowhere else for it to face");
    }
    depots.set(key, { ...existing, side: next });
    return { ok: true, cost: 0 };
  }

  const problem = depotProblem(world, view, kind, tile);
  if (problem || sides.length === 0) {
    return fail(problem ?? DEPOT_PLACE[kind]);
  }
  const cost = depotCost(world, kind, tile);
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }
  depots.set(key, { owner: companyId, kind, side: sides[0], builtAt: now });
  spend(root, companyId, cost);
  return { ok: true, cost };
}

// Puts a signal beside a piece of track. Using the same tool on it again
// turns it to face the other way, and another signal tool changes what kind
// of signal it is.
export function buildSignal(
  root: Root,
  world: World,
  companyId: string,
  kind: SignalKind,
  tile: number
): ActionResult {
  if (!root.get("companies").has(companyId)) {
    return fail("Your company isn't ready yet");
  }
  const key = String(tile);
  const view = liveView(root, world);
  const problem = signalProblem(view, tile);
  if (problem) {
    return fail(problem);
  }
  if (root.get("rails").get(key) !== companyId) {
    return fail("That railway belongs to another company");
  }

  const signals = root.get("signals");
  const [first, second] = SIDES.filter((side) => view.links(tile) & side);
  const existing = signals.get(key);
  if (existing?.kind === kind) {
    // Clicking a signal again changes which way it faces: the one way, the
    // other and, for a block signal, both
    const ways =
      kind === "block" ? [first | second, first, second] : [first, second];
    signals.set(key, {
      ...existing,
      side: ways[(ways.indexOf(existing.side) + 1) % ways.length],
    });
    return { ok: true, cost: 0 };
  }

  const { cost } = SIGNALS[kind];
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }
  // Another kind of signal takes the place of the one that is there, and
  // faces the way that one did. A new block signal faces both ways.
  const faced = existing ? existing.side & (first | second) : 0;
  signals.set(key, {
    owner: companyId,
    kind,
    side:
      faced === first || faced === second
        ? faced
        : kind === "block" && !existing
          ? first | second
          : first,
  });
  spend(root, companyId, cost);
  return { ok: true, cost };
}

// Sells a vehicle: the company keeps what it earned, and gets half of its
// price back
function sellOff(root: Root, vehicleId: string) {
  const vehicles = root.get("vehicles");
  const vehicle = vehicles.get(vehicleId);
  const company = vehicle
    ? root.get("companies").get(vehicle.get("owner"))
    : undefined;
  if (!vehicle || !company) {
    return 0;
  }
  const refund =
    vehicle.get("status") === "wreck"
      ? 0
      : Math.round(priceOf(modelOf(vehicle.toJSON()), vehicle.get("cars")) / 2);
  company.update({
    banked: company.get("banked") + vehicle.get("earned"),
    spent: company.get("spent") - refund,
  });
  vehicles.delete(vehicleId);
  return refund;
}

// Takes a tile of railway away, along with its signal, and with what
// joined the tiles around it onto it
function removeRail(root: Root, size: number, tile: number) {
  const key = String(tile);
  const railLinks = root.get("railLinks");
  root.get("rails").delete(key);
  root.get("signals").delete(key);
  railLinks.delete(key);
  for (const side of SIDES) {
    const other = String(neighbor(size, tile, side));
    const mask = railLinks.get(other) ?? 0;
    if (mask & opposite(side)) {
      railLinks.set(other, mask & ~opposite(side));
    }
  }
}

// Clears the given tiles: the company's own stations, depots, signals,
// tracks and canals are removed for free, and a town's buildings and
// streets for a price. One thing is removed per tile at a time: a signal or
// a station first, then the track it was on, and a bridge before the canal
// under it.
export function bulldoze(
  root: Root,
  world: World,
  companyId: string,
  tiles: number[]
): ActionResult {
  const { size } = world;
  const roads = root.get("roads");
  const rails = root.get("rails");
  const canals = root.get("canals");
  const stations = root.get("stations");
  const depots = root.get("depots");
  const signals = root.get("signals");
  const vehicles = root.get("vehicles");
  const demolished = root.get("demolished");
  const company = root.get("companies").get(companyId);
  if (!company) {
    return fail("Your company isn't ready yet");
  }
  const balance = liveBalance(root, companyId);
  const view = liveView(root, world);

  let removed = 0;
  let cost = 0;
  let problem = "Nothing to remove here";

  for (const tile of tiles.slice(0, MAX_TILES_PER_BUILD)) {
    const key = String(tile);
    const station = stations.get(key);
    const depot = depots.get(key);

    if (world.houseAt[tile] >= 0) {
      // All of the building goes, also when it covers more tiles than this
      const house = world.houses[world.houseAt[tile]];
      const covered = buildingTiles(
        size,
        house.y * size + house.x,
        house.variant
      );
      if (covered.some((other) => demolished.has(String(other)))) {
        continue;
      }
      const price = demolishCost(world, tile);
      if (cost + price > balance) {
        problem = "Not enough money";
        continue;
      }
      for (const other of covered) {
        demolished.set(String(other), companyId);
      }
      cost += price;
      removed++;
    } else if (world.industryAt[tile] >= 0) {
      problem = "Industries can't be demolished";
    } else if (signals.has(key) && rails.get(key) === companyId) {
      signals.delete(key);
      removed++;
    } else if (station) {
      if (station.get("owner") !== companyId) {
        problem = "That belongs to another company";
        continue;
      }
      // Vehicles that were sent to this tile go to what is left of the
      // station. When this was all of it, they have nowhere to go, and are
      // sold.
      const rest =
        liveStations(root, size)
          .at(tile)
          ?.tiles.filter((other) => other !== tile) ?? [];
      const heir =
        rest.find((other) => tileDistance(world, other, tile) === 1) ?? rest[0];
      for (const [id, vehicle] of [...vehicles.entries()]) {
        const stops = vehicle.get("stops");
        if (!stops.includes(key)) {
          continue;
        }
        if (heir === undefined) {
          sellOff(root, id);
        } else {
          vehicle.set(
            "stops",
            stops.map((stop) => (stop === key ? String(heir) : stop))
          );
        }
      }
      stations.delete(key);
      removed++;
    } else if (depot) {
      if (depot.owner !== companyId) {
        problem = "That belongs to another company";
        continue;
      }
      // Vehicles that hadn't left it yet are sold along with it
      for (const [id, vehicle] of [...vehicles.entries()]) {
        if (
          vehicle.get("leg") < 0 &&
          vehicle.get("limit") === 0 &&
          vehicle.get("path")[0] === tile
        ) {
          sellOff(root, id);
        }
      }
      depots.delete(key);
      removed++;
    } else if (
      hasLooseStreet(world, view, tile) &&
      (roads.get(key) ?? companyId) === companyId
    ) {
      if (cost + STREET_REMOVAL_COST > balance) {
        problem = "Not enough money";
        continue;
      }
      // The town doesn't lay a street here again. A road that the company
      // had there before the town grew over it goes as well.
      demolished.set(key, companyId);
      roads.delete(key);
      cost += STREET_REMOVAL_COST;
      removed++;
    } else if (rails.get(key) === companyId) {
      removeRail(root, size, tile);
      removed++;
    } else {
      const mine = [roads, canals].find(
        (layer) => layer.get(key) === companyId
      );
      if (mine) {
        mine.delete(key);
        removed++;
      } else if (rails.has(key) || roads.has(key) || canals.has(key)) {
        problem = "That belongs to another company";
      }
    }
  }

  if (cost > 0) {
    spend(root, companyId, cost);
  }
  return removed > 0 ? { ok: true, cost } : fail(problem);
}

// Why a vehicle from this depot couldn't run between two stations, or null
// if it could
export function routeProblem(
  network: Network,
  depotTile: number,
  depot: Pick<DepotData, "kind" | "side">,
  from: Station,
  to: Station
) {
  const { size } = network;
  const { kind } = depot;
  const { depotLabel } = TRANSPORT[kind];
  const exit = neighbor(size, depotTile, depot.side);
  const noWayOut = `There is no way from this ${depotLabel.toLowerCase()} to ${from.name}`;

  if (kind !== "rail") {
    const grid = gridOf(network, kind);
    if (exit < 0 || !findPath(grid, size, exit, from.tiles)) {
      return noWayOut;
    }
    return findPath(grid, size, from.tiles[0], to.tiles) ? null : NO_WAY[kind];
  }

  const way =
    exit >= 0 && network.rail[exit]
      ? findRailPath(network, exit, depot.side, (tile, heading) =>
          isPlatformEnd(network, from, tile, heading)
        )
      : null;
  if (!way) {
    return noWayOut;
  }
  // From there the train goes on, or back the way it came
  return findRailPath(network, way[way.length - 1], 0, (tile, heading) =>
    isPlatformEnd(network, to, tile, heading)
  )
    ? null
    : NO_WAY.rail;
}

// What a player picked at a depot: which vehicle, and for a train, with how
// many carriages
export type Order = { depot: number; model: string; cars: number };

// Buys a vehicle at a depot, to run between two stations. It starts inside
// the depot and drives to the first station from there.
export function buyVehicle(
  root: Root,
  world: World,
  network: Network,
  companyId: string,
  order: Order,
  fromTile: number,
  toTile: number,
  now: number
): ActionResult {
  const vehicles = root.get("vehicles");
  const stations = liveStations(root, world.size);
  const from = stations.at(fromTile);
  const to = stations.at(toTile);
  const depot = root.get("depots").get(String(order.depot));
  const model = MODELS.find((each) => each.id === order.model);

  if (!root.get("companies").has(companyId)) {
    return fail("Your company isn't ready yet");
  }
  if (!depot || depot.owner !== companyId || model?.kind !== depot.kind) {
    return fail("Vehicles are bought at one of your depots");
  }
  if (!from || !to || from.id === to.id) {
    return fail("Pick two different stations");
  }
  if (from.owner !== companyId || to.owner !== companyId) {
    return fail("Vehicles can only stop at your own stations");
  }
  const { kind } = depot;
  if (from.kind !== kind || to.kind !== kind) {
    const { vehicleLabel, stationLabel } = TRANSPORT[kind];
    return fail(
      `A ${vehicleLabel.toLowerCase()} from this depot goes from ${stationLabel.toLowerCase()} to ${stationLabel.toLowerCase()}`
    );
  }
  const noWay = routeProblem(network, order.depot, depot, from, to);
  if (noWay) {
    return fail(noWay);
  }

  // A vehicle with nothing to carry would only cost money
  const cargo = [
    ...cargoBetween(world, from.tiles, to.tiles),
    ...cargoBetween(world, to.tiles, from.tiles),
  ];
  if (cargo.length === 0) {
    return fail(nothingToCarry(world, from, to));
  }

  let owned = 0;
  for (const vehicle of vehicles.values()) {
    if (
      vehicle.get("owner") === companyId &&
      vehicle.get("status") !== "wreck"
    ) {
      owned++;
    }
  }
  if (owned >= MAX_VEHICLES_PER_COMPANY) {
    return fail(`You can't own more than ${MAX_VEHICLES_PER_COMPANY} vehicles`);
  }

  const cars =
    kind === "rail"
      ? Math.max(1, Math.min(model.maxCars ?? 1, Math.round(order.cars)))
      : 0;
  const cost = priceOf(model, cars);
  if (cost > liveBalance(root, companyId)) {
    return fail("Not enough money");
  }

  vehicles.set(
    nanoid(),
    new LiveObject<VehicleData>({
      owner: companyId,
      kind,
      model: model.id,
      cars,
      stops: [from.id, to.id],
      // On its way out of the depot, to its first station
      leg: -1,
      path: [order.depot, neighbor(world.size, order.depot, depot.side)],
      status: "dock",
      from: 0,
      departAt: now,
      limit: 0,
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
    message: `${from.name} → ${to.name}`,
  };
}

// Buys another vehicle like this one, for the same route, at the closest of
// the company's depots that it can get there from
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
  const kind = vehicle.get("kind");
  const stations = liveStations(root, world.size);
  const [from, to] = vehicle.get("stops").map((stop) => stations.at(stop));
  if (!from || !to) {
    return fail("One of its stations is gone");
  }

  const depots = [...root.get("depots").entries()]
    .filter(([, depot]) => depot.owner === companyId && depot.kind === kind)
    .map(([key, depot]) => ({ tile: Number(key), depot }))
    .sort(
      (a, b) =>
        tileDistance(world, a.tile, from.tile) -
        tileDistance(world, b.tile, from.tile)
    );
  const nearest =
    depots.find(
      ({ tile, depot }) => routeProblem(network, tile, depot, from, to) === null
    ) ?? depots[0];
  if (!nearest) {
    return fail(
      `Build a ${TRANSPORT[kind].depotLabel.toLowerCase()} first: that is where vehicles are bought`
    );
  }
  return buyVehicle(
    root,
    world,
    network,
    companyId,
    {
      depot: nearest.tile,
      model: vehicle.get("model"),
      cars: vehicle.get("cars"),
    },
    from.tile,
    to.tile,
    now
  );
}

export function sellVehicle(
  root: Root,
  companyId: string,
  vehicleId: string
): ActionResult {
  const vehicle = root.get("vehicles").get(vehicleId);
  if (!vehicle || vehicle.get("owner") !== companyId) {
    return fail("That vehicle isn't yours");
  }
  if (vehicle.get("status") === "wreck") {
    return fail("There's nothing left of it to sell");
  }
  return { ok: true, cost: -sellOff(root, vehicleId) };
}

// What changed about a vehicle, as the fields to write to Storage
function changesOf(before: Vehicle, after: Vehicle) {
  const changes: Partial<VehicleData> = {};
  if (after.path !== before.path) {
    changes.path = [...after.path];
  }
  if (after.load !== before.load) {
    changes.load = { ...after.load };
  }
  if (after.status !== before.status) {
    changes.status = after.status;
  }
  if (after.from !== before.from) {
    changes.from = after.from;
  }
  if (after.departAt !== before.departAt) {
    changes.departAt = after.departAt;
  }
  if (after.limit !== before.limit) {
    changes.limit = after.limit;
  }
  if (after.leg !== before.leg) {
    changes.leg = after.leg;
  }
  if (after.earned !== before.earned) {
    changes.earned = after.earned;
  }
  if (after.lastIncome !== before.lastIncome) {
    changes.lastIncome = after.lastIncome;
  }
  if (after.trips !== before.trips) {
    changes.trips = after.trips;
  }
  return changes;
}

// Moves every vehicle along up to `now`, and writes down what changed.
// Returns the crashes that happened, with the companies whose trains were
// wrecked in each.
export function runSimulation(
  root: Root,
  world: World,
  network: Network,
  now: number,
  memory: SimulationMemory
) {
  const live = root.get("vehicles");
  const vehicles = new Map<string, Vehicle>(Object.entries(live.toJSON()));
  const stations = new Map<string, StationData>(
    Object.entries(root.get("stations").toJSON())
  );
  const industries = new Map(root.get("industries").entries());

  const result = advance(
    world,
    network,
    vehicles,
    stations,
    industries,
    root.get("startedAt"),
    now,
    memory
  );

  for (const [id, vehicle] of result.vehicles) {
    const before = vehicles.get(id);
    if (before) {
      live.get(id)?.update(changesOf(before, vehicle));
    }
  }
  // The wreck of a train is cleared away. What the train had earned stays
  // with its company.
  for (const [id, vehicle] of result.removed) {
    const company = root.get("companies").get(vehicle.owner);
    company?.set("scrapped", (company.get("scrapped") ?? 0) + vehicle.earned);
    live.delete(id);
  }
  for (const [key, stock] of result.stocks) {
    root.get("stations").get(key)?.set("stock", stock);
  }
  for (const [id, state] of result.industries) {
    root.get("industries").set(id, state);
  }
  return result.crashes.map((crash) => ({
    tile: crash.tile,
    owners: crash.vehicles.flatMap((id) => {
      const owner = vehicles.get(id)?.owner;
      return owner === undefined ? [] : [owner];
    }),
  }));
}

// Writes down how every company is doing, once per period, for the graphs
// in the statistics window. Any client can do this: they would all write
// the same thing. `eager` clients write as soon as a period starts, the
// others only when nobody has for a while. `world` is the map with its
// towns as they are now. Returns whether anything was written.
export function recordStats(
  root: Root,
  world: World,
  now: number,
  eager: boolean
) {
  const stats = root.get("stats");
  const elapsed = Math.max(0, now - root.get("startedAt"));
  const index = Math.floor(elapsed / STATS_PERIOD_MS);
  const late = elapsed - index * STATS_PERIOD_MS > STATS_PERIOD_MS / 3;
  if (stats.has(String(index)) || !(eager || late)) {
    return false;
  }

  const companies: StatsSample["companies"] = {};
  for (const [id, company] of root.get("companies").entries()) {
    companies[id] = {
      balance: liveBalance(root, id),
      earned: company.get("banked") + (company.get("scrapped") ?? 0),
      vehicles: 0,
    };
  }
  for (const vehicle of root.get("vehicles").values()) {
    const entry = companies[vehicle.get("owner")];
    if (entry) {
      entry.earned += vehicle.get("earned");
      entry.vehicles += vehicle.get("status") === "wreck" ? 0 : 1;
    }
  }
  let freight = 0;
  for (const industry of root.get("industries").values()) {
    freight += industry.received;
  }
  stats.set(String(index), {
    companies,
    population: townStats(world).reduce(
      (sum, town) => sum + town.population,
      0
    ),
    freight,
  });

  // Only the last hour or so is kept
  for (const key of [...stats.keys()]) {
    if (Number(key) <= index - STATS_SAMPLES) {
      stats.delete(key);
    }
  }
  return true;
}

// Rooms from before the game had depots, signals and carriages are brought
// up to date the first time someone opens them: railways are joined wherever
// they touch, as they used to be, and vehicles carry on from where they
// were. Only this and a new map write `version`: `initialStorage` leaves it
// out, as Liveblocks adds what is missing from it to an existing room too.
// Returns whether anything had to be done.
export function upgradeStorage(root: Root, size: number) {
  if (root.get("version") === STORAGE_VERSION) {
    return false;
  }

  if (!root.get("railLinks")) {
    root.set("railLinks", new LiveMap());
  }
  if (!root.get("signals")) {
    root.set("signals", new LiveMap());
  }
  if (!root.get("depots")) {
    root.set("depots", new LiveMap());
  }
  const rails = root.get("rails");
  const railLinks = root.get("railLinks");
  for (const key of rails.keys()) {
    if (railLinks.has(key)) {
      continue;
    }
    let mask = 0;
    for (const side of SIDES) {
      if (rails.has(String(neighbor(size, Number(key), side)))) {
        mask |= side;
      }
    }
    railLinks.set(key, mask);
  }

  for (const vehicle of root.get("vehicles").values()) {
    if (vehicle.get("status") !== undefined) {
      continue;
    }
    // They used to drive from one station to the next without stopping
    const path = vehicle.get("path");
    const stops = vehicle.get("stops");
    const moving = path.length >= 2;
    vehicle.update({
      model: DEFAULT_MODEL[vehicle.get("kind")],
      cars: vehicle.get("kind") === "rail" ? DEFAULT_CARS : 0,
      status: moving ? "run" : "lost",
      path: moving ? path : [Number(stops[vehicle.get("leg") % stops.length])],
      from: 0,
      limit: moving ? path.length - 1 : 0,
    });
  }
  root.set("version", STORAGE_VERSION);
  return true;
}

// Wipes everything players have built and starts over on a new map, which
// is never paused
export function resetGame(
  root: Root,
  seed: number,
  size: number,
  { climate, landscape }: MapOptions,
  wallTime: number
) {
  setSpeed(root, "play", wallTime);
  const now = timeOf(root, wallTime);
  root.update({
    version: STORAGE_VERSION,
    seed,
    size,
    climate,
    landscape,
    startedAt: now,
    towns: new LiveMap(),
    industries: new LiveMap(),
    stats: new LiveMap(),
    demolished: new LiveMap(),
    roads: new LiveMap(),
    rails: new LiveMap(),
    canals: new LiveMap(),
    railLinks: new LiveMap(),
    signals: new LiveMap(),
    depots: new LiveMap(),
    stations: new LiveMap(),
    vehicles: new LiveMap(),
    companies: new LiveMap(),
  });
}
