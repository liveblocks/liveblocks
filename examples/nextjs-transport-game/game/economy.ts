import {
  BRIDGE_MULTIPLIER,
  CATCHMENT,
  HOUSE_PASSENGER_RATE,
  MIN_HOUSES_FOR_PASSENGERS,
  START_MONEY,
  STOCK_CAP,
  TRACK,
  TREE_CLEAR_COST,
} from "./constants";
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

export function suggestStationName(world: World, tile: number) {
  const info = getStationInfo(world, tile);
  if (info.industries.length > 0) {
    return info.industries[0].name;
  }
  if (!info.town) {
    return "Halt";
  }
  const dx = (tile % world.size) - info.town.x;
  const dy = Math.floor(tile / world.size) - info.town.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) <= 2) {
    return `${info.town.name} Central`;
  }
  if (info.houses < MIN_HOUSES_FOR_PASSENGERS) {
    return `${info.town.name} Halt`;
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return `${info.town.name} ${dx > 0 ? "East" : "West"}`;
  }
  return `${info.town.name} ${dy > 0 ? "South" : "North"}`;
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
