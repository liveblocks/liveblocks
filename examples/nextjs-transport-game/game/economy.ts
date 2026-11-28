import {
  BRIDGE_MULTIPLIER,
  BUILDINGS,
  CARGO,
  CARGO_KINDS,
  CATCHMENT,
  DOCK_CATCHMENT,
  INDUSTRY_MAX_LEVEL,
  INDUSTRY_PERIOD_MS,
  INDUSTRY_SHARE,
  MIN_HOUSES_FOR_PASSENGERS,
  PASSENGERS_PER_PERSON,
  START_MONEY,
  STOCK_CAP,
  TRACK,
  TREE_CLEAR_COST,
} from "./constants";
import { createRng, hashInt } from "./rng";
import type {
  Cargo,
  CompanyData,
  IndustryState,
  LineKind,
  StationData,
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

// How many people a building adds to the places around it: the ones who
// live or work in it (no two buildings have quite as many), or who visit it
export function peopleIn(house: Pick<House, "x" | "y" | "variant">) {
  const { residents, visitors } = BUILDINGS[house.variant];
  return residents > 0
    ? residents + (hashInt(house.x * 131 + house.y) % (residents >> 1))
    : (visitors ?? 0);
}

// What a station placed on a given tile would serve
export type StationInfo = {
  // What shows up to be carried away from the station: passengers from the
  // buildings around it, and what the industries around it make. `rate` is
  // in units per second, for an industry that hasn't grown yet.
  supply: { cargo: Cargo; rate: number }[];
  accepts: Cargo[];
  houses: number;
  // How many people live, work or spend time within reach. The more there
  // are, the more passengers turn up.
  population: number;
  town: Town | null;
  industries: Industry[];
};

const stationInfoCache = new WeakMap<World, Map<number, StationInfo>>();

// How many tiles around it a station on this tile serves. Only docks are
// built out on the water, away from what they serve. A dock on a canal is
// in among the buildings, and reaches as far as any other station.
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
  let population = 0;

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
        const house = world.houses[world.houseAt[other]];
        houses++;
        // A building that covers several tiles counts for as much of it as
        // is within reach
        population +=
          peopleIn(house) / (BUILDINGS[house.variant].size ?? 1) ** 2;
      }
      if (world.industryAt[other] >= 0) {
        industries.add(world.industries[world.industryAt[other]]);
      }
    }
  }
  population = Math.round(population);

  const supply = new Map<Cargo, number>();
  const accepts = new Set<Cargo>();
  if (houses >= MIN_HOUSES_FOR_PASSENGERS) {
    supply.set("passengers", population * PASSENGERS_PER_PERSON);
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
    population,
    town: nearestTown(world, x, y),
    industries: [...industries],
  };
  cache.set(tile, info);
  return info;
}

// How many passengers can be waiting at a station: a busy station has room
// for more of them
export function passengerCap(rate: number) {
  return Math.max(STOCK_CAP, Math.round(rate * 60));
}

// Passengers waiting at a station at a given time. They pile up at the
// supply rate since the last time a vehicle loaded some, so nothing needs to
// "tick".
export function stockAt(
  station: Pick<StationData, "stock" | "builtAt">,
  cargo: Cargo,
  rate: number,
  time: number
) {
  const entry = station.stock[cargo] ?? { amount: 0, at: station.builtAt };
  const elapsed = Math.max(0, time - entry.at) / 1000;
  return Math.min(passengerCap(rate), entry.amount + elapsed * rate);
}

// Units per second that an industry makes
export function industryOutput(industry: Industry, level: number) {
  return (INDUSTRY[industry.type].rate ?? 0) * 2 ** level;
}

// How much of it can pile up before the industry stops making more
export function industryCap(level: number) {
  return STOCK_CAP * 2 ** level;
}

// An industry that no vehicle has been to yet has been producing since the
// map started
export function industryState(
  saved: IndustryState | undefined,
  startedAt: number
): IndustryState {
  return (
    saved ?? {
      stock: 0,
      at: startedAt,
      level: 0,
      moved: 0,
      since: startedAt,
      received: 0,
    }
  );
}

// What an industry has waiting to be carried away at a given time. Every
// station in reach loads from this same pile, so building more stations
// around an industry doesn't make it produce more.
export function industryStock(
  industry: Industry,
  state: IndustryState,
  time: number
) {
  const elapsed = Math.max(0, time - state.at) / 1000;
  return Math.min(
    industryCap(state.level),
    state.stock + elapsed * industryOutput(industry, state.level)
  );
}

// The share of what an industry made that was carried away, since that was
// last looked at
export function industryService(
  industry: Industry,
  state: IndustryState,
  time: number
) {
  const made =
    (industryOutput(industry, state.level) * Math.max(0, time - state.since)) /
    1000;
  return made > 0 ? Math.min(1, state.moved / made) : 0;
}

// A vehicle loads `amount` from an industry. An industry that keeps being
// emptied grows: when enough of what it made was carried away for long
// enough, it starts making twice as much.
export function loadFromIndustry(
  industry: Industry,
  state: IndustryState,
  amount: number,
  time: number
): IndustryState {
  const next = {
    ...state,
    stock: Math.max(0, industryStock(industry, state, time) - amount),
    at: time,
    moved: state.moved + amount,
  };
  if (time - state.since >= INDUSTRY_PERIOD_MS) {
    if (
      industryService(industry, next, time) >= INDUSTRY_SHARE &&
      state.level < INDUSTRY_MAX_LEVEL
    ) {
      next.level++;
    }
    next.moved = 0;
    next.since = time;
  }
  return next;
}

// What is waiting at a station at a given time, and how much of it there
// is room for. Passengers wait at the station itself. Everything else waits
// at the industries that make it.
export function waitingAt(
  world: World,
  tile: number,
  station: Pick<StationData, "stock" | "builtAt">,
  industryOf: (industry: Industry) => IndustryState,
  time: number
) {
  const info = getStationInfo(world, tile);
  return info.supply.map(({ cargo, rate }) => {
    if (cargo === "passengers") {
      return {
        cargo,
        amount: stockAt(station, cargo, rate, time),
        cap: passengerCap(rate),
        rate,
      };
    }
    let amount = 0;
    let cap = 0;
    let output = 0;
    for (const industry of info.industries) {
      if (INDUSTRY[industry.type].produces === cargo) {
        const state = industryOf(industry);
        amount += industryStock(industry, state, time);
        cap += industryCap(state.level);
        output += industryOutput(industry, state.level);
      }
    }
    return { cargo, amount, cap, rate: output };
  });
}

// What a vehicle has on board, the biggest load first
export function loadOf(vehicle: Pick<VehicleData, "load">) {
  return CARGO_KINDS.flatMap((cargo) => {
    const amount = vehicle.load[cargo] ?? 0;
    return amount > 0 ? [{ cargo, amount }] : [];
  }).sort((a, b) => b.amount - a.amount);
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
      distance: Math.abs(other.x - industry.x) + Math.abs(other.y - industry.y),
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
  taken: ReadonlySet<string>,
  dock: boolean
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
    if (dock) {
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

// What a tile of road, railway or canal costs. Roads and railways cross
// water, canals included, on bridges.
export function trackCost(
  world: World,
  kind: LineKind,
  tile: number,
  overWater: boolean
) {
  const base = TRACK[kind].cost;
  if (overWater) {
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
