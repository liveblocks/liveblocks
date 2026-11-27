import {
  BRIDGE_MULTIPLIER,
  BUILDINGS,
  CARGO,
  CATCHMENT,
  DOCK_CATCHMENT,
  HOUSE_PASSENGER_RATE,
  MIN_HOUSES_FOR_PASSENGERS,
  START_MONEY,
  STOCK_CAP,
  TRACK,
  TREE_CLEAR_COST,
} from "./constants";
import { createRng, hashInt } from "./rng";
import type {
  Cargo,
  CompanyData,
  StationData,
  TrackKind,
  VehicleData,
} from "./types";
import {
  type Industry,
  INDUSTRY,
  nearestTown,
  type Town,
  WATER,
  type World,
} from "./world";

// What a station placed on a given tile would serve
export type StationInfo = {
  // Units per second of each cargo that shows up at the station
  supply: { cargo: Cargo; rate: number }[];
  accepts: Cargo[];
  houses: number;
  town: Town | null;
  industries: Industry[];
};

const stationInfoCache = new WeakMap<World, Map<number, StationInfo>>();

// How many tiles around it a station on this tile serves. Only docks are
// built on water.
export function catchmentOf(world: World, tile: number) {
  return world.terrain[tile] === WATER ? DOCK_CATCHMENT : CATCHMENT;
}

export function getStationInfo(world: World, tile: number): StationInfo {
  let cache = stationInfoCache.get(world);
  if (!cache) {
    cache = new Map();
    stationInfoCache.set(world, cache);
  }
  const cached = cache.get(tile);
  if (cached) {
    return cached;
  }

  const { size } = world;
  const x = tile % size;
  const y = Math.floor(tile / size);
  const industries = new Set<Industry>();
  let houses = 0;
  // Bigger buildings supply more passengers, so a station in a town that
  // grows gets busier
  let passengers = 0;

  const reach = catchmentOf(world, tile);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) {
        continue;
      }
      const other = ty * size + tx;
      if (world.houseAt[other] >= 0) {
        houses++;
        passengers +=
          BUILDINGS[world.houses[world.houseAt[other]].variant].passengers;
      }
      if (world.industryAt[other] >= 0) {
        industries.add(world.industries[world.industryAt[other]]);
      }
    }
  }

  const supply = new Map<Cargo, number>();
  const accepts = new Set<Cargo>();
  if (houses >= MIN_HOUSES_FOR_PASSENGERS) {
    supply.set("passengers", passengers * HOUSE_PASSENGER_RATE);
    accepts.add("passengers");
  }
  for (const industry of industries) {
    const { produces, rate, accepts: accepted } = INDUSTRY[industry.type];
    if (produces && rate) {
      supply.set(produces, (supply.get(produces) ?? 0) + rate);
    }
    if (accepted) {
      accepts.add(accepted);
    }
  }

  const info: StationInfo = {
    supply: [...supply].map(([cargo, rate]) => ({ cargo, rate })),
    accepts: [...accepts],
    houses,
    town: nearestTown(world, x, y),
    industries: [...industries],
  };
  cache.set(tile, info);
  return info;
}

// Cargo waiting at a station at a given time. It piles up at the supply rate
// since the last time a vehicle loaded some, so nothing needs to "tick".
export function stockAt(
  station: Pick<StationData, "stock" | "builtAt">,
  cargo: Cargo,
  rate: number,
  time: number
) {
  const entry = station.stock[cargo] ?? { amount: 0, at: station.builtAt };
  const elapsed = Math.max(0, time - entry.at) / 1000;
  return Math.min(STOCK_CAP, entry.amount + elapsed * rate);
}

// The cargo a vehicle would carry on a trip between two stations
export function cargoBetween(
  world: World,
  fromTile: number,
  toTile: number
): Cargo[] {
  const accepted = getStationInfo(world, toTile).accepts;
  return getStationInfo(world, fromTile)
    .supply.map((entry) => entry.cargo)
    .filter((cargo) => accepted.includes(cargo));
}

function listCargo(cargo: readonly Cargo[]) {
  return cargo.map((each) => CARGO[each].label.toLowerCase()).join(" and ");
}

// Why no vehicle could earn anything between two stations, for the player
// who just tried to buy one
export function nothingToCarry(
  world: World,
  from: { tile: number; name: string },
  to: { tile: number; name: string }
) {
  const reasons = [
    [from, to],
    [to, from],
  ].flatMap(([origin, destination]) => {
    const supply = getStationInfo(world, origin.tile).supply;
    return supply.length > 0
      ? [
          `${destination.name} doesn't accept ${listCargo(
            supply.map((entry) => entry.cargo)
          )}`,
        ]
      : [];
  });
  return reasons.length > 0
    ? `Nothing to carry: ${reasons.join(", and ")}`
    : "Nothing to carry: nothing is produced near either station";
}

// The industries an industry trades with: the ones that accept what it
// produces, or that produce what it accepts. Closest first.
export function tradePartners(world: World, industry: Industry) {
  const { produces, accepts } = INDUSTRY[industry.type];
  return world.industries
    .filter((other) => {
      const type = INDUSTRY[other.type];
      return (
        (produces !== undefined && type.accepts === produces) ||
        (accepts !== undefined && type.produces === accepts)
      );
    })
    .map((other) => ({
      industry: other,
      distance:
        Math.abs(other.x - industry.x) + Math.abs(other.y - industry.y),
    }))
    .sort((a, b) => a.distance - b.distance);
}

// Whether a station on this tile would serve this industry
export function servesIndustry(world: World, tile: number, industry: Industry) {
  return getStationInfo(world, tile).industries.some(
    (each) => each.id === industry.id
  );
}

export function tileDistance(world: World, a: number, b: number) {
  const { size } = world;
  return (
    Math.abs((a % size) - (b % size)) +
    Math.abs(Math.floor(a / size) - Math.floor(b / size))
  );
}

// Names a station can get when the ones that describe where it is are gone.
// `*` is the name of the town.
const STATION_NAMES = [
  "* Transfer",
  "* Exchange",
  "* Annexe",
  "* Sidings",
  "* Branch",
  "* Junction",
  "* Cross",
  "* Green",
  "* Parkway",
  "* Market",
  "* Gate",
  "* Heights",
  "* Valley",
  "* Fields",
  "* Common",
  "* Square",
  "* Lane",
  "* Halt",
  "Upper *",
  "Lower *",
  "New *",
  "Old *",
];

// What docks are called before they get one of the names above
const DOCK_NAMES = ["* Docks", "* Harbour", "* Pier", "* Quay", "* Wharf"];

// Picks a name for a new station that no other station has, whichever
// company owns it. A station is named after what it is next to if that name
// is still free, and gets one of the other names at random if not.
export function suggestStationName(
  world: World,
  tile: number,
  taken: ReadonlySet<string>
) {
  const { size } = world;
  const info = getStationInfo(world, tile);
  const x = tile % size;
  const y = Math.floor(tile / size);
  const names = info.industries.map((industry) => industry.name);

  if (info.town) {
    const town = info.town.name;
    const dx = x - info.town.x;
    const dy = y - info.town.y;
    if (world.terrain[tile] === WATER) {
      names.push(...DOCK_NAMES.map((name) => name.replace("*", town)));
    } else if (Math.max(Math.abs(dx), Math.abs(dy)) <= 2) {
      names.push(`${town} Central`);
    } else if (info.houses < MIN_HOUSES_FOR_PASSENGERS) {
      names.push(`${town} Halt`);
    }
    names.push(
      Math.abs(dx) > Math.abs(dy)
        ? `${town} ${dx > 0 ? "East" : "West"}`
        : `${town} ${dy > 0 ? "South" : "North"}`
    );

    let trees = false;
    let water = false;
    for (let ny = Math.max(0, y - 2); ny <= Math.min(size - 1, y + 2); ny++) {
      for (let nx = Math.max(0, x - 2); nx <= Math.min(size - 1, x + 2); nx++) {
        trees = trees || world.trees[ny * size + nx] > 0;
        water = water || world.terrain[ny * size + nx] === WATER;
      }
    }
    if (trees) {
      names.push(`${town} Woods`);
    }
    if (water) {
      names.push(`${town} Lakeside`);
    }

    const others = STATION_NAMES.map((name) => name.replace("*", town));
    const rng = createRng(hashInt(tile + world.seed));
    for (let index = others.length - 1; index > 0; index--) {
      const other = Math.floor(rng() * (index + 1));
      [others[index], others[other]] = [others[other], others[index]];
    }
    names.push(...others);
  }

  const free = names.find((name) => !taken.has(name));
  if (free) {
    return free;
  }
  // Every name is in use: number them
  const base = names[0] ?? "Halt";
  let number = 2;
  while (taken.has(`${base} ${number}`)) {
    number++;
  }
  return taken.has(base) ? `${base} ${number}` : base;
}

export function trackCost(world: World, kind: TrackKind, tile: number) {
  const base = TRACK[kind].cost;
  if (world.terrain[tile] === WATER) {
    return base * BRIDGE_MULTIPLIER;
  }
  return base + world.trees[tile] * TREE_CLEAR_COST;
}

// A company's balance is derived, not stored. `spent` is only ever written by
// the company's owner and `earned` only moves forward with a vehicle's trips,
// so two clients never overwrite each other's money.
export function companyBalance(
  company: Pick<CompanyData, "spent" | "banked"> | undefined,
  vehicles: Iterable<Pick<VehicleData, "owner" | "earned">>,
  userId: string
) {
  if (!company) {
    return START_MONEY;
  }
  let balance = START_MONEY + company.banked - company.spent;
  for (const vehicle of vehicles) {
    if (vehicle.owner === userId) {
      balance += vehicle.earned;
    }
  }
  return balance;
}

export function formatMoney(amount: number) {
  const rounded = Math.round(amount);
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
}
