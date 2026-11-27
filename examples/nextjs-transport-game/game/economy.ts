import {
  BRIDGE_MULTIPLIER,
  CATCHMENT,
  HOUSE_PASSENGER_RATE,
  MIN_HOUSES_FOR_PASSENGERS,
  START_MONEY,
  STOCK_CAP,
  TOWN_GROWTH_PER_MINUTE,
  TOWN_GROWTH_PER_STATION,
  TOWN_MAX_GROWTH,
  TOWN_MAX_STATIONS,
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
  type House,
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

  for (let dy = -CATCHMENT; dy <= CATCHMENT; dy++) {
    for (let dx = -CATCHMENT; dx <= CATCHMENT; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= size || ty >= size) {
        continue;
      }
      const other = ty * size + tx;
      if (world.houseAt[other] >= 0) {
        houses++;
      }
      if (world.industryAt[other] >= 0) {
        industries.add(world.industries[world.industryAt[other]]);
      }
    }
  }

  const supply = new Map<Cargo, number>();
  const accepts = new Set<Cargo>();
  if (houses >= MIN_HOUSES_FOR_PASSENGERS) {
    supply.set("passengers", houses * HOUSE_PASSENGER_RATE);
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
    if (Math.max(Math.abs(dx), Math.abs(dy)) <= 2) {
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
    townResidentsCache.set(world, residents);
  }
  return residents;
}

// For each town, when the stations that serve it were built (oldest first).
// A station serves the town it is closest to, if it has houses in range.
export function townServices(
  world: World,
  stations: ReadonlyMap<string, Pick<StationData, "builtAt">>
) {
  const services: number[][] = world.towns.map(() => []);
  for (const [key, station] of stations) {
    const info = getStationInfo(world, Number(key));
    if (info.town && info.houses >= MIN_HOUSES_FOR_PASSENGERS) {
      services[info.town.id].push(station.builtAt);
    }
  }
  for (const builtAts of services) {
    builtAts.sort((a, b) => a - b);
  }
  return services;
}

// A town's population is not stored anywhere. It is worked out from when the
// map was started and when the stations serving the town were built, so
// every player sees the same number without anyone having to update it.
export function townPopulation(
  world: World,
  town: number,
  // When the stations serving this town were built: `townServices()[town]`
  builtAts: readonly number[],
  startedAt: number,
  now: number
) {
  const minutes = (since: number) => Math.max(0, now - since) / 60_000;
  let growth = TOWN_GROWTH_PER_MINUTE * minutes(startedAt);
  for (const builtAt of builtAts.slice(0, TOWN_MAX_STATIONS)) {
    growth += TOWN_GROWTH_PER_STATION * minutes(builtAt);
  }
  const residents = townResidents(world)[town];
  return Math.round(residents * (1 + Math.min(TOWN_MAX_GROWTH, growth)));
}

// How many people a town gains per minute at the moment
export function townGrowthPerMinute(
  world: World,
  town: number,
  builtAts: readonly number[],
  startedAt: number,
  now: number
) {
  return (
    townPopulation(world, town, builtAts, startedAt, now + 60_000) -
    townPopulation(world, town, builtAts, startedAt, now)
  );
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
