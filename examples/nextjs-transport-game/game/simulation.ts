import {
  CAR_GAP,
  CARGO,
  CATCHUP_MS,
  CLAIM_AHEAD,
  LOAD_MS,
  LOOKAHEAD_MS,
  RETRY_MS,
  START_MS,
  STEP_MS,
  WRECK_MS,
} from "./constants";
import {
  getStationInfo,
  industryState,
  industryStock,
  loadFromIndustry,
  loadOf,
  tileDistance,
  waitingAt,
} from "./economy";
import {
  along,
  capacityOf,
  headDistance,
  modelOf,
  runningCostOf,
  tilesUnder,
  timeAt,
} from "./motion";
import {
  blockFrom,
  connectionsAt,
  countSides,
  findPath,
  findRailPath,
  gridOf,
  neighbor,
  type Network,
  NORTH,
  opposite,
  sideIndex,
  SIDES,
  sideToward,
} from "./network";
import {
  carriagesAt,
  groupStations,
  isPlatformEnd,
  platformLength,
  type Station,
} from "./stations";
import type {
  IndustryState,
  Load,
  StationData,
  Stock,
  Transport,
  Vehicle,
} from "./types";
import { type Industry, INDUSTRY, type World } from "./world";

// What whoever moves the vehicles remembers from one time to the next. None
// of it is in Storage: someone else who takes over starts with nothing.
export type SimulationMemory = {
  // The game time up to which the vehicles were moved
  at: number;
  // Vehicle → the vehicle that was in its way the last time it tried to
  // move on
  blockedBy: Map<string, string>;
};

export function newMemory(): SimulationMemory {
  return { at: -Infinity, blockedBy: new Map() };
}

export type Crash = {
  // Where it happened
  tile: number;
  // The trains that were wrecked by it
  vehicles: string[];
};

export type SimulationResult = {
  // Vehicles that changed, as they are now
  vehicles: Map<string, Vehicle>;
  // Wrecks that were cleared away
  removed: Map<string, Vehicle>;
  // Stations that vehicles loaded passengers from, by the key of their
  // oldest tile
  stocks: Map<string, Stock>;
  // Industries that vehicles loaded from or delivered to, by id
  industries: Map<string, IndustryState>;
  crashes: Crash[];
};

// A tile that another train has counts as this many tiles when a train
// picks its way, so it would rather go around
const BUSY_TRACK = 6;
// The same for a train that is held at a signal and looks for another way
const BLOCKED_TRACK = 40;
// Stands for "more than one vehicle" where a single one is expected
const SEVERAL = "*";
const EPSILON = 1e-6;

// Which way a vehicle faces on the tile at `index` of its path, as one of
// the direction bits
function headingAt(size: number, path: readonly number[], index: number) {
  if (index > 0) {
    return sideToward(size, path[index - 1], path[index]);
  }
  return path.length > 1 ? sideToward(size, path[0], path[1]) : NORTH;
}

// The first tile of a train's path, from `index` on, where a signal faces
// the train: that is as far as it may go without being let through. The end
// of its path if there is none.
function nextSignal(network: Network, path: readonly number[], index: number) {
  const last = path.length - 1;
  for (let at = Math.max(0, index); at < last; at++) {
    if (
      (network.signals.get(path[at])?.side ?? 0) &
      sideToward(network.size, path[at], path[at + 1])
    ) {
      return at;
    }
  }
  return last;
}

// Moves every vehicle along, up to `now`.
//
// A vehicle follows `path`, and at any time it may only drive as far along
// it as `limit`. Everyone works out where a vehicle is from when it last set
// off, so all there is to do here is to hand out more of the way ahead. How
// that is done is what keeps vehicles from driving through each other:
//
// - Road vehicles and ships are only given tiles that no other vehicle has.
//   A road has a lane each way, so vehicles wait for the ones in front of
//   them, and for the ones crossing at a junction. A canal has room for one
//   ship at a time.
// - Trains are given track without looking, all the way to the next signal
//   that faces them, and wait there until the signal lets them through. Two
//   trains that end up on the same tile crash.
//
// One client does this for all vehicles, in small steps of game time.
export function advance(
  world: World,
  network: Network,
  vehicles: ReadonlyMap<string, Vehicle>,
  stationData: ReadonlyMap<string, StationData>,
  industries: ReadonlyMap<string, IndustryState>,
  startedAt: number,
  now: number,
  memory: SimulationMemory
): SimulationResult {
  const { size } = world;
  const stations = groupStations(stationData, size);
  const fleet = new Map(vehicles);
  const changed = new Set<string>();
  const removed = new Map<string, Vehicle>();
  const changedStocks = new Map<string, Stock>();
  const changedIndustries = new Map<string, IndustryState>();
  const crashes: Crash[] = [];

  // Which vehicle has each piece of road, railway or water right now.
  // Worked out again whenever a vehicle changes.
  let claims: { [kind in Transport]?: Map<number, string> } = {};

  const update = (id: string, patch: Partial<Vehicle>) => {
    const next = { ...fleet.get(id)!, ...patch };
    fleet.set(id, next);
    changed.add(id);
    delete claims[next.kind];
    return next;
  };

  const stationOf = (key: string): Station | undefined => {
    const station = stations.at(key);
    const stock = station ? changedStocks.get(station.id) : undefined;
    return station && stock ? { ...station, stock } : station;
  };
  const industryOf = (industry: Industry) =>
    changedIndustries.get(String(industry.id)) ??
    industryState(industries.get(String(industry.id)), startedAt);

  const junctions = new Map<number, boolean>();
  const isJunction = (tile: number) => {
    let junction = junctions.get(tile);
    if (junction === undefined) {
      junction = countSides(connectionsAt(network.road, size, tile)) >= 3;
      junctions.set(tile, junction);
    }
    return junction;
  };
  const isDock = (tile: number) => stations.at(tile)?.kind === "water";

  // What a vehicle holds while it is on the tile at `index` of its path. A
  // piece of railway, a road junction, a canal and a dock have room for
  // one vehicle. A road and open water have a lane for each way.
  const slotOf = (vehicle: Vehicle, index: number) => {
    if (vehicle.leg < 0 && index === 0) {
      // Still inside its depot
      return -1;
    }
    const tile = vehicle.path[index];
    if (
      vehicle.kind === "rail" ||
      (vehicle.kind === "road" && isJunction(tile)) ||
      (vehicle.kind === "water" && (network.canal[tile] === 1 || isDock(tile)))
    ) {
      return tile * 8 + 4;
    }
    return tile * 8 + sideIndex(headingAt(size, vehicle.path, index));
  };

  // Tiles a vehicle can't stand still on: it has to be given the way
  // across them in one go
  const isThrough = (vehicle: Vehicle, index: number) => {
    const tile = vehicle.path[index];
    return vehicle.kind === "road"
      ? isJunction(tile)
      : vehicle.kind === "water" && network.canal[tile] === 1 && !isDock(tile);
  };

  const claimsOf = (kind: Transport, time: number) => {
    let map = claims[kind];
    if (map) {
      return map;
    }
    map = new Map<number, string>();
    for (const [id, vehicle] of fleet) {
      if (vehicle.kind !== kind) {
        continue;
      }
      const under = tilesUnder(vehicle, time);
      const last = Math.min(
        vehicle.path.length - 1,
        Math.max(under.last, Math.ceil(vehicle.limit))
      );
      for (let index = under.first; index <= last; index++) {
        const slot = slotOf(vehicle, index);
        if (slot >= 0) {
          const holder = map.get(slot);
          map.set(slot, holder === undefined || holder === id ? id : SEVERAL);
        }
      }
    }
    claims[kind] = map;
    return map;
  };

  // The vehicle that is in the way of `vehicle` at `index` of its path, if
  // there is one
  const holderAt = (
    id: string,
    vehicle: Vehicle,
    index: number,
    time: number,
    ignore?: ReadonlySet<string>
  ) => {
    const slot = slotOf(vehicle, index);
    const holder = slot >= 0 ? claimsOf(vehicle.kind, time).get(slot) : id;
    return holder === undefined || holder === id || ignore?.has(holder)
      ? null
      : holder;
  };

  const isStill = (id: string, time: number) => {
    const vehicle = fleet.get(id);
    return (
      vehicle !== undefined &&
      (vehicle.status !== "run" ||
        headDistance(vehicle, time) >= vehicle.limit - EPSILON)
    );
  };

  // Vehicles that are each waiting for the next one, all the way around to
  // the first one again, would wait forever. Returns them, if `id` is one.
  const deadlockOf = (id: string, time: number) => {
    const ring = [id];
    let at = memory.blockedBy.get(id);
    while (at !== undefined && at !== id) {
      if (ring.includes(at) || ring.length > 40 || !isStill(at, time)) {
        return null;
      }
      ring.push(at);
      at = memory.blockedBy.get(at);
    }
    return at === id ? ring : null;
  };

  // Gives a road vehicle or a ship more of its path: as far ahead as it
  // looks, or as far as nobody else has it
  const claimAhead = (
    id: string,
    vehicle: Vehicle,
    time: number,
    ignore?: ReadonlySet<string>
  ) => {
    const last = vehicle.path.length - 1;
    const reach = Math.min(
      last,
      Math.floor(headDistance(vehicle, time)) +
        Math.ceil((modelOf(vehicle).speed * LOOKAHEAD_MS) / 1000) +
        CLAIM_AHEAD
    );
    let { limit } = vehicle;
    let blocker: string | null = null;
    while (limit < reach && blocker === null) {
      let end = limit + 1;
      while (end < last && isThrough(vehicle, end)) {
        end++;
      }
      for (let index = limit + 1; index <= end && blocker === null; index++) {
        blocker = holderAt(id, vehicle, index, time, ignore);
      }
      if (blocker === null) {
        limit = end;
      }
    }
    return { limit, blocker };
  };

  // The same, and when the vehicles in the way turn out to be waiting for
  // this one in turn, one of them goes anyway: better two vehicles squeezing
  // past each other than a jam that never clears
  const claimOrSqueeze = (id: string, vehicle: Vehicle, time: number) => {
    const result = claimAhead(id, vehicle, time);
    if (result.limit > vehicle.limit || result.blocker === null) {
      memory.blockedBy.delete(id);
      return result.limit;
    }
    if (result.blocker !== SEVERAL) {
      memory.blockedBy.set(id, result.blocker);
      const ring = deadlockOf(id, time);
      if (ring && ring.every((other) => id <= other)) {
        memory.blockedBy.delete(id);
        return claimAhead(id, vehicle, time, new Set(ring)).limit;
      }
    }
    return vehicle.limit;
  };

  // Whether a train that stands at `index` of `path` may go on to `upTo`. A
  // block signal wants the whole block behind it empty. A path signal, and
  // the door of an engine shed, only the tiles the train will use.
  const isClear = (
    id: string,
    path: readonly number[],
    index: number,
    upTo: number,
    wholeBlock: boolean,
    time: number
  ) => {
    const map = claimsOf("rail", time);
    const free = (tile: number) => {
      const holder = map.get(tile * 8 + 4);
      return holder === undefined || holder === id;
    };
    for (let at = index + 1; at <= upTo; at++) {
      if (!free(path[at])) {
        return false;
      }
    }
    return (
      !wholeBlock ||
      blockFrom(
        network,
        path[index + 1],
        sideToward(size, path[index + 1], path[index])
      ).every(free)
    );
  };

  const busyTrack =
    (id: string, time: number, weight: number) => (tile: number) => {
      const holder = claimsOf("rail", time).get(tile * 8 + 4);
      return holder === undefined || holder === id ? 0 : weight;
    };

  // A train at a signal, or at the door of its shed: it is let through if
  // the way is free, and by another way if only its own is taken
  const passSignal = (id: string, vehicle: Vehicle, time: number) => {
    const { path, limit: index } = vehicle;
    const leaving = vehicle.leg < 0 && index === 0;
    const wholeBlock =
      !leaving && network.signals.get(path[index])?.kind === "block";

    const upTo = nextSignal(network, path, index + 1);
    if (isClear(id, path, index, upTo, wholeBlock, time)) {
      return { path, limit: upTo };
    }
    const destination = stationOf(
      vehicle.stops[(vehicle.leg + 1) % vehicle.stops.length]
    );
    if (wholeBlock || !destination) {
      return null;
    }

    // From its shed, a train can only go the way the shed faces
    const start = leaving ? 1 : index;
    const way = findRailPath(
      network,
      path[start],
      headingAt(size, path, start),
      (tile, heading) => isPlatformEnd(network, destination, tile, heading),
      busyTrack(id, time, BLOCKED_TRACK)
    );
    if (!way) {
      return null;
    }
    const other = [...path.slice(0, start), ...way];
    const otherUpTo = nextSignal(network, other, index + 1);
    return other.length > index + 1 &&
      isClear(id, other, index, otherUpTo, false, time)
      ? { path: other, limit: otherUpTo }
      : null;
  };

  // A vehicle that stood still sets off a moment later, so that everyone
  // sees it leave from where it stood
  const setOff = (vehicle: Vehicle, time: number, limit: number) =>
    headDistance(vehicle, time) >= vehicle.limit - EPSILON
      ? { from: vehicle.limit, departAt: time + START_MS, limit }
      : { limit };

  const moveOn = (id: string, vehicle: Vehicle, time: number) => {
    if (vehicle.kind !== "rail") {
      const limit = claimOrSqueeze(id, vehicle, time);
      if (limit > vehicle.limit) {
        update(id, setOff(vehicle, time, limit));
      }
      return;
    }
    const pass = passSignal(id, vehicle, time);
    if (pass) {
      update(id, { ...setOff(vehicle, time, pass.limit), path: pass.path });
    }
  };

  // How many carriages of a train can load and unload where a path ends: as
  // many as fit along the platform there
  const carriagesAtEnd = (
    vehicle: Pick<Vehicle, "cars">,
    path: readonly number[],
    station: Station
  ) => {
    const last = path.length - 1;
    return last < 1
      ? vehicle.cars
      : Math.min(
          vehicle.cars,
          carriagesAt(
            platformLength(
              network,
              station,
              path[last],
              sideToward(size, path[last - 1], path[last])
            )
          )
        );
  };

  const arrive = (id: string, vehicle: Vehicle, time: number) => {
    const count = vehicle.stops.length;
    const last = vehicle.path.length - 1;
    const destination = stationOf(vehicle.stops[(vehicle.leg + 1) % count]);

    let income = 0;
    if (
      vehicle.leg >= 0 &&
      destination &&
      destination.tiles.includes(vehicle.path[last])
    ) {
      const { accepts, industries: nearby } = getStationInfo(
        world,
        destination.tiles
      );
      const distance = tileDistance(
        world,
        Number(vehicle.stops[vehicle.leg % count]),
        destination.tile
      );
      for (const { cargo, amount } of loadOf(vehicle)) {
        if (!accepts.includes(cargo)) {
          continue;
        }
        income += amount * Math.max(1, distance) * CARGO[cargo].rate;
        // Freight ends up at the industry that wanted it
        const buyer = nearby.find(
          (industry) => INDUSTRY[industry.type].accepts === cargo
        );
        if (buyer) {
          const state = industryOf(buyer);
          changedIndustries.set(String(buyer.id), {
            ...state,
            received: state.received + amount,
          });
        }
      }
    }
    const runningCost = last * runningCostOf(modelOf(vehicle), vehicle.cars);
    // The drive from the depot to the first station isn't a trip
    const trip = vehicle.leg >= 0;

    memory.blockedBy.delete(id);
    update(id, {
      status: "dock",
      from: last,
      limit: last,
      departAt: time + LOAD_MS,
      leg: (vehicle.leg + 1) % count,
      load: {},
      earned: vehicle.earned + Math.round(income - runningCost),
      lastIncome: trip ? Math.round(income) : vehicle.lastIncome,
      trips: trip ? vehicle.trips + 1 : vehicle.trips,
    });
  };

  // The way to its next station for a vehicle that stands still: the path
  // it would follow, and how far along that path it already is
  const planLeg = (
    id: string,
    vehicle: Vehicle,
    destination: Station,
    time: number
  ) => {
    const { path } = vehicle;
    const head = Math.round(vehicle.limit);
    const isGoal = (tile: number, heading: number) =>
      isPlatformEnd(network, destination, tile, heading);
    const busy = busyTrack(id, time, BUSY_TRACK);

    if (vehicle.leg < 0 && head === 0) {
      // Out of its depot, by the side that the depot faces
      const depot = network.depots.get(path[0]);
      const exit = depot ? neighbor(size, path[0], depot.side) : -1;
      if (!depot || exit < 0) {
        return null;
      }
      const way =
        vehicle.kind === "rail"
          ? findRailPath(network, exit, depot.side, isGoal, busy)
          : findPath(
              gridOf(network, vehicle.kind),
              size,
              exit,
              destination.tiles
            );
      return way ? { path: [path[0], ...way], from: 0 } : null;
    }

    if (vehicle.kind !== "rail") {
      // Rather to a part of the station where nobody is
      const map = claimsOf(vehicle.kind, time);
      const free = destination.tiles.filter((tile) => {
        for (let slot = tile * 8; slot < tile * 8 + 5; slot++) {
          const holder = map.get(slot);
          if (holder !== undefined && holder !== id) {
            return false;
          }
        }
        return true;
      });
      const goals = free.length > 0 ? free : destination.tiles;
      const grid = gridOf(network, vehicle.kind);
      // A ship goes around the docks that other ships are at, if it can
      let around: Uint8Array | null = null;
      if (vehicle.kind === "water") {
        for (const station of stations.all) {
          for (const tile of station.kind === "water" ? station.tiles : []) {
            const holder = map.get(tile * 8 + 4);
            if (
              holder !== undefined &&
              holder !== id &&
              tile !== path[head] &&
              !goals.includes(tile)
            ) {
              around = around ?? grid.slice();
              around[tile] = 0;
            }
          }
        }
      }
      const way =
        (around ? findPath(around, size, path[head], goals) : null) ??
        findPath(grid, size, path[head], goals);
      return way && way.length > 1 ? { path: way, from: 0 } : null;
    }

    // A train goes on the way it was going, or back the way it came with
    // its engine at the other end, whichever is shorter. Either way its
    // carriages stand on the first tiles of its new path.
    let tail = tilesUnder(vehicle, time).first;
    if (network.depots.has(path[tail]) && tail < head) {
      tail++;
    }
    const body = path.slice(tail, head + 1);
    const onward = findRailPath(
      network,
      path[head],
      head > 0 ? headingAt(size, path, head) : 0,
      isGoal,
      busy
    );
    const back = findRailPath(
      network,
      path[tail],
      tail < head ? sideToward(size, path[tail + 1], path[tail]) : 0,
      isGoal,
      busy
    );
    if (onward && (!back || onward.length <= back.length)) {
      return { path: [...body, ...onward.slice(1)], from: head - tail };
    }
    if (!back) {
      return null;
    }
    const reversed = [...body.reverse(), ...back.slice(1)];
    return {
      path: reversed,
      from: Math.min(
        along({ kind: "rail", path: reversed }, 0, vehicle.cars * CAR_GAP),
        head - tail
      ),
    };
  };

  // Loads every kind of cargo that the destination accepts. A station can
  // have several, e.g. passengers from a town and coal from a mine next to
  // it. When more is waiting than fits, the room on board is split evenly
  // between the kinds, and what one kind leaves unused goes to the others.
  const load = (
    origin: Station,
    destination: Station,
    capacity: number,
    time: number
  ) => {
    const accepted = getStationInfo(world, destination.tiles).accepts;
    const waiting = waitingAt(world, origin.tiles, origin, industryOf, time)
      .filter((supply) => accepted.includes(supply.cargo))
      .sort((a, b) => a.amount - b.amount);

    const onBoard: Load = {};
    const stock = { ...origin.stock };
    let room = capacity;
    waiting.forEach(({ cargo, amount }, index) => {
      const fairShare = Math.floor(room / (waiting.length - index));
      const taken = Math.min(Math.floor(amount), fairShare);
      if (taken <= 0) {
        return;
      }
      onBoard[cargo] = taken;
      room -= taken;
      if (cargo === "passengers") {
        stock[cargo] = { amount: amount - taken, at: time };
        changedStocks.set(origin.id, stock);
        return;
      }
      // Freight comes off the piles of the industries that make it
      let left = taken;
      for (const industry of getStationInfo(world, origin.tiles).industries) {
        if (INDUSTRY[industry.type].produces !== cargo || left <= 0) {
          continue;
        }
        const state = industryOf(industry);
        const part = Math.min(
          left,
          Math.floor(industryStock(industry, state, time))
        );
        if (part > 0) {
          changedIndustries.set(
            String(industry.id),
            loadFromIndustry(industry, state, part, time)
          );
          left -= part;
        }
      }
    });
    return onBoard;
  };

  const depart = (id: string, vehicle: Vehicle, time: number) => {
    const count = vehicle.stops.length;
    const origin =
      vehicle.leg >= 0 ? stationOf(vehicle.stops[vehicle.leg % count]) : null;
    const destination = stationOf(vehicle.stops[(vehicle.leg + 1) % count]);
    const plan = destination ? planLeg(id, vehicle, destination, time) : null;

    if (!destination || !plan) {
      // A station or a piece of track is gone. Wait and try again later.
      memory.blockedBy.delete(id);
      update(id, { status: "lost", departAt: time + RETRY_MS });
      return;
    }

    let next: Vehicle = {
      ...vehicle,
      status: "run",
      path: plan.path,
      from: plan.from,
      departAt: time + START_MS,
      limit: Math.floor(plan.from),
    };
    const leavingDepot = vehicle.leg < 0 && plan.from === 0;
    if (vehicle.kind === "rail") {
      // The door of an engine shed lets a new train out like a signal
      // would. Any other train just goes.
      next.limit = leavingDepot
        ? 0
        : nextSignal(network, plan.path, Math.ceil(plan.from));
    } else {
      // Turning around on a road takes the lane the other way to be free
      const turning =
        slotOf(next, 0) !== slotOf(vehicle, vehicle.path.length - 1);
      const inTheWay = turning ? holderAt(id, next, 0, time) : null;
      const limit = inTheWay === null ? claimOrSqueeze(id, next, time) : 0;
      if (limit < 1) {
        if (inTheWay !== null && inTheWay !== SEVERAL) {
          memory.blockedBy.set(id, inTheWay);
        }
        // The way out is taken: it stays where it is, and tries again
        return;
      }
      next.limit = limit;
    }

    const here = vehicle.path[vehicle.path.length - 1];
    if (origin && origin.tiles.includes(here)) {
      const cars =
        vehicle.kind === "rail"
          ? Math.min(
              carriagesAtEnd(vehicle, vehicle.path, origin),
              carriagesAtEnd(vehicle, plan.path, destination)
            )
          : 0;
      next = {
        ...next,
        load: load(
          origin,
          destination,
          capacityOf(modelOf(vehicle), cars),
          time
        ),
      };
    }
    memory.blockedBy.delete(id);
    update(id, next);
  };

  // Trains that are on the same tile have run into each other
  const crash = (time: number) => {
    const under = new Map<number, string>();
    for (const [id, vehicle] of fleet) {
      if (vehicle.kind !== "rail") {
        continue;
      }
      const { first, last } = tilesUnder(vehicle, time);
      for (let index = first; index <= last; index++) {
        if (slotOf(vehicle, index) < 0) {
          continue;
        }
        const tile = vehicle.path[index];
        const other = under.get(tile);
        if (other === undefined || other === id) {
          under.set(tile, id);
          continue;
        }
        const wrecked = [id, other].filter(
          (each) => fleet.get(each)!.status !== "wreck"
        );
        for (const each of wrecked) {
          const at = headDistance(fleet.get(each)!, time);
          update(each, {
            status: "wreck",
            from: at,
            limit: at,
            departAt: time,
            load: {},
          });
          memory.blockedBy.delete(each);
        }
        if (wrecked.length > 0) {
          crashes.push({ tile, vehicles: wrecked });
        }
      }
    }
  };

  const step = (time: number) => {
    claims = {};
    crash(time);

    // The ones that have been waiting the longest go first
    const waiting: { id: string; since: number }[] = [];
    for (const [id, vehicle] of fleet) {
      if (vehicle.status === "wreck") {
        if (time - vehicle.departAt >= WRECK_MS) {
          removed.set(id, vehicle);
          fleet.delete(id);
          changed.delete(id);
          claims = {};
        }
        continue;
      }
      const running = vehicle.status === "run";
      const since = running ? timeAt(vehicle, vehicle.limit) : vehicle.departAt;
      // A vehicle asks for more of its way a little before it runs out
      const early =
        running && vehicle.limit < vehicle.path.length - 1 ? LOOKAHEAD_MS : 0;
      if (since - early <= time) {
        waiting.push({ id, since });
      }
    }
    waiting.sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));

    for (const { id } of waiting) {
      const vehicle = fleet.get(id);
      if (!vehicle || vehicle.status === "wreck") {
        continue;
      }
      if (vehicle.status !== "run") {
        depart(id, vehicle, time);
      } else if (vehicle.limit >= vehicle.path.length - 1) {
        arrive(id, vehicle, time);
      } else {
        moveOn(id, vehicle, time);
      }
    }
  };

  // Pick up where the last call left off, without making up for more than
  // a short while: when nobody was around, vehicles waited where they were
  let time =
    Math.floor(Math.max(memory.at, now - CATCHUP_MS) / STEP_MS) * STEP_MS;
  while (time + STEP_MS <= now) {
    time += STEP_MS;
    step(time);
  }
  memory.at = time;
  for (const id of [...memory.blockedBy.keys()]) {
    if (!fleet.has(id)) {
      memory.blockedBy.delete(id);
    }
  }

  return {
    vehicles: new Map([...changed].map((id) => [id, fleet.get(id)!])),
    removed,
    stocks: changedStocks,
    industries: changedIndustries,
    crashes,
  };
}

type Player = { connectionId: number; presence: { away: boolean } };

// There is no game server: one of the players' browsers does what a server
// would. That is the player who has been in the room the longest, among the
// ones whose tab is showing.
export function isHost(self: Player, others: readonly Player[]) {
  const awake = others.filter((other) => !other.presence.away);
  if (self.presence.away && awake.length > 0) {
    return false;
  }
  // With every tab hidden, the one that has been here the longest carries
  // on as well as it can
  return (self.presence.away ? others : awake).every(
    (other) => other.connectionId > self.connectionId
  );
}

// Whether a vehicle is standing still on its way, waiting for a signal or
// for the vehicle in front of it
export function isHeldUp(vehicle: Vehicle, time: number) {
  return (
    vehicle.status === "run" &&
    vehicle.limit < vehicle.path.length - 1 &&
    headDistance(vehicle, time) >= vehicle.limit - EPSILON
  );
}

// What stands for the signal on a tile that faces the trains leaving by
// one of its sides, in the set that `greenSignals` returns
export function signalKey(tile: number, side: number) {
  return tile * 16 + side;
}

// The signals that show green at a given time. A block signal is green
// while there is no train in the block behind it. A path signal only turns
// green for a train that it has let through.
export function greenSignals(
  network: Network,
  vehicles: Iterable<Vehicle>,
  time: number
) {
  const { size, signals } = network;
  const green = new Set<number>();
  if (signals.size === 0) {
    return green;
  }

  const taken = new Set<number>();
  for (const vehicle of vehicles) {
    if (vehicle.kind !== "rail") {
      continue;
    }
    const { path } = vehicle;
    const under = tilesUnder(vehicle, time);
    const last = Math.min(
      path.length - 1,
      Math.max(under.last, Math.ceil(vehicle.limit))
    );
    for (let index = under.first; index <= last; index++) {
      if (vehicle.leg >= 0 || index > 0) {
        taken.add(path[index]);
      }
      // A signal that the front of the train has yet to pass
      const out =
        index >= under.last && index < last
          ? sideToward(size, path[index], path[index + 1])
          : 0;
      if ((signals.get(path[index])?.side ?? 0) & out) {
        green.add(signalKey(path[index], out));
      }
    }
  }

  for (const [tile, signal] of signals) {
    for (const side of signal.kind === "block" ? SIDES : []) {
      const behind = neighbor(size, tile, side);
      if (
        signal.side & side &&
        behind >= 0 &&
        blockFrom(network, behind, opposite(side)).every(
          (each) => !taken.has(each)
        )
      ) {
        green.add(signalKey(tile, side));
      }
    }
  }
  return green;
}
