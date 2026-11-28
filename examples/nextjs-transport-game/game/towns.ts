import {
  BUILDING_TIERS,
  BUILDINGS,
  PARK,
  SHOPS,
  STADIUM,
  TOWN_GROWTH_PER_STATION,
  TOWN_MAX_STATIONS,
  TOWN_RADIUS,
} from "./constants";
import { peopleIn } from "./economy";
import { createRng, hashInt } from "./rng";
import type { TownGrowth, Vehicle } from "./types";
import {
  buildingTiles,
  type House,
  nearestTown,
  streetLines,
  type Town,
  WATER,
  type World,
} from "./world";

// Towns grow on their own: streets get longer along the town's grid, houses
// appear along them, and buildings are replaced by bigger ones, up to
// skyscrapers in the center. Now and then a town gets something else than a
// house: shops, a park, a stadium.
//
// None of that is stored. Each town has a fixed list of growth steps that
// every client works out from the map seed, and how far down that list a
// town is only depends on the clock and on the stations in it that vehicles
// call at. So all players see the same buildings appear at the same time,
// without anyone writing them to Storage.
//
// A town that nobody transports anything to or from doesn't grow at all.

export type GrowthStep =
  | { kind: "street" | "house" | "upgrade"; tile: number }
  // Shops, a park or a stadium, as an index into `BUILDINGS`. It takes the
  // place of the small houses that are in its way.
  | { kind: "place"; tile: number; variant: number };

const MAX_TIER = BUILDING_TIERS - 1;
// Buildings are allowed to get taller as a town moves through its first
// steps. After this many, the only thing left is to catch up.
const STEPS_TO_FULL_HEIGHT = 900;
const MAX_STEPS = 3000;
// How much shorter buildings get with every tile away from the center
const HEIGHT_FALLOFF = 0.42;
// How good a tile is for more street: making a street longer is better than
// starting a new one at a corner (which scores 1), and closing a gap between
// two pieces of the same street is best
const STREET_END = 3;
const STREET_GAP = 6;
// The two streets through the center of a town grow faster than the others
const MAIN_STREET = 1.5;

// Which streets of a town's grid can run through a tile
const NORTH_SOUTH = 1;
const EAST_WEST = 2;

// Where a town can build, and which of its tiles are for streets
export type TownLayout = {
  // The land the town can grow on: dry land in a circle around its center
  // that is closer to it than to any other town
  area: number[];
  // Tiles on a neighboring town's land where this town can only lay street
  borrowed: number[];
  // Per tile of the map: which streets of the grid can run through it.
  // Buildings only go where none can.
  lines: Uint8Array;
};

// Every town has its own grid of streets, and two grids don't line up. Where
// the land of two towns meets, a street of one could end up right next to a
// street of the other, side by side for as far as their border goes. So
// there, the two towns share one street: the one that is already there,
// or else the one of the town that was founded first. The other town gives
// up its own, builds on that tile instead, and helps lay the shared street.
export function townLayout(world: World, town: Town): TownLayout {
  const { size } = world;
  const area: number[] = [];
  const borrowed: number[] = [];
  const lines = new Uint8Array(size * size);

  for (let dy = -TOWN_RADIUS; dy <= TOWN_RADIUS; dy++) {
    for (let dx = -TOWN_RADIUS; dx <= TOWN_RADIUS; dx++) {
      const x = town.x + dx;
      const y = town.y + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) {
        continue;
      }
      const tile = y * size + x;
      if (
        withinTown(dx, dy) &&
        world.terrain[tile] !== WATER &&
        world.industryAt[tile] < 0 &&
        nearestTown(world, x, y) === town
      ) {
        area.push(tile);
        const { northSouth, eastWest } = streetLines(town, x, y);
        if (world.houseAt[tile] < 0) {
          lines[tile] =
            (northSouth ? NORTH_SOUTH : 0) | (eastWest ? EAST_WEST : 0);
        }
      }
    }
  }

  for (const tile of area) {
    const x = tile % size;
    const y = Math.floor(tile / size);
    for (const line of [NORTH_SOUTH, EAST_WEST]) {
      if (!(lines[tile] & line)) {
        continue;
      }
      // The tiles on either side of the street
      for (const side of [-1, 1]) {
        const nx = line === NORTH_SOUTH ? x + side : x;
        const ny = line === NORTH_SOUTH ? y : y + side;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
          continue;
        }
        const next = ny * size + nx;
        const other = nearestTown(world, nx, ny);
        if (!other || world.terrain[next] === WATER) {
          continue;
        }
        if (other === town) {
          // A street of another town that already runs alongside, on this
          // town's land
          const ax = line === NORTH_SOUTH ? 0 : 1;
          const ay = line === NORTH_SOUTH ? 1 : 0;
          const road = (rx: number, ry: number) =>
            rx >= 0 &&
            ry >= 0 &&
            rx < size &&
            ry < size &&
            world.townRoads[ry * size + rx] === 1;
          if (
            world.townRoads[tile] !== 1 &&
            road(nx, ny) &&
            !(lines[next] & line) &&
            (road(nx - ax, ny - ay) || road(nx + ax, ny + ay))
          ) {
            lines[tile] &= ~line;
          }
          continue;
        }
        const theirs = streetLines(other, nx, ny);
        if (!(line === NORTH_SOUTH ? theirs.northSouth : theirs.eastWest)) {
          continue;
        }
        const mine =
          world.townRoads[tile] === 1 ||
          (world.townRoads[next] !== 1 && town.id < other.id);
        if (!mine) {
          lines[tile] &= ~line;
          if (!lines[next]) {
            borrowed.push(next);
          }
          // Streets that cross the border here can join the shared one
          const crossing = streetLines(town, nx, ny);
          lines[next] |=
            line |
            (line === NORTH_SOUTH
              ? crossing.eastWest
                ? EAST_WEST
                : 0
              : crossing.northSouth
                ? NORTH_SOUTH
                : 0);
        }
      }
    }
  }
  return { area, borrowed, lines };
}

const plans = new WeakMap<World, (GrowthStep[] | undefined)[]>();

// The growth steps of a town, in order. `world` has to be the world as
// generated from its seed, not one that already grew. A town is only
// planned when someone asks: most towns on a map never get a station.
export function townPlan(world: World, town: number) {
  let planned = plans.get(world);
  if (!planned) {
    planned = [];
    plans.set(world, planned);
  }
  return (planned[town] ??= planTown(world, world.towns[town]));
}

function planTown(world: World, town: Town) {
  const { size } = world;
  // A scratch copy of the map to plan on. Towns can't get in each other's
  // way: each one only builds on the land that is closest to it.
  const streets = world.townRoads.slice();
  const tiers = new Int8Array(size * size).fill(-1);
  for (const house of world.houses) {
    const corner = house.y * size + house.x;
    for (const tile of buildingTiles(size, corner, house.variant)) {
      tiers[tile] = house.variant;
    }
  }
  const rng = createRng(hashInt(world.seed + (town.id + 1) * 7919));

  const neighbor = (tile: number, dx: number, dy: number) => {
    const x = (tile % size) + dx;
    const y = Math.floor(tile / size) + dy;
    return x < 0 || y < 0 || x >= size || y >= size ? -1 : y * size + x;
  };
  const isStreet = (tile: number) => tile >= 0 && streets[tile] === 1;
  // Towns are round: everything about how they grow goes by the distance
  // to their center as the crow flies
  const distance = (tile: number) =>
    Math.hypot((tile % size) - town.x, Math.floor(tile / size) - town.y);

  const { area, borrowed, lines } = townLayout(world, town);
  const everywhere = [...area, ...borrowed];

  // The tallest building a tile can have. Buildings get taller toward the
  // center, and everywhere as the town gets older.
  const tallest = (tile: number, progress: number) => {
    const variation = (hashInt(tile * 31 + world.seed) % 100) / 100;
    const tier =
      1.6 +
      2.6 * progress -
      HEIGHT_FALLOFF * Math.max(0, distance(tile) - 1) +
      variation;
    return Math.max(0, Math.min(MAX_TIER, Math.floor(tier)));
  };

  // How good a tile is for a new piece of street, or 0 if it can't have one.
  // Streets only follow the lines of the town's grid, and only get there
  // from a street that is already on that line or crosses it.
  const streetScore = (tile: number) => {
    const northSouth = (lines[tile] & NORTH_SOUTH) !== 0;
    const eastWest = (lines[tile] & EAST_WEST) !== 0;
    let score = 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const onLine = dx !== 0 ? eastWest : northSouth;
      if (!onLine || !isStreet(neighbor(tile, -dx, -dy))) {
        continue;
      }
      const main =
        dx !== 0
          ? tile >= town.y * size && tile < (town.y + 1) * size
          : tile % size === town.x;
      let kind = 1;
      if (isStreet(neighbor(tile, dx, dy))) {
        kind = STREET_GAP;
      } else if (isStreet(neighbor(tile, -2 * dx, -2 * dy))) {
        kind = STREET_END;
      }
      score = Math.max(score, kind * (main ? MAIN_STREET : 1));
    }
    return score;
  };

  const nextToStreet = (tile: number) =>
    isStreet(neighbor(tile, 1, 0)) ||
    isStreet(neighbor(tile, -1, 0)) ||
    isStreet(neighbor(tile, 0, 1)) ||
    isStreet(neighbor(tile, 0, -1));

  // Where shops, a park or a stadium could go: on a street, on tiles that
  // are empty or only have small houses. Shops go toward the center, parks
  // and stadiums away from it.
  const inArea = new Set(area);
  const sitesFor = (variant: number) => {
    const sites: { tile: number; weight: number }[] = [];
    for (const corner of area) {
      const tiles = buildingTiles(size, corner, variant);
      const free = tiles.every(
        (tile) =>
          inArea.has(tile) && !streets[tile] && !lines[tile] && tiers[tile] <= 1
      );
      if (!free || !tiles.some(nextToStreet)) {
        continue;
      }
      const far = Math.min(...tiles.map(distance));
      const empty = tiles.filter((tile) => tiers[tile] < 0).length;
      let weight = (1 + empty) / (1 + far);
      if (variant === STADIUM) {
        weight = far >= 3 ? (1 + empty) ** 2 : 0;
      } else if (variant === PARK) {
        weight = far >= 2 ? 1 + empty : 0;
      }
      if (weight > 0) {
        sites.push({ tile: corner, weight });
      }
    }
    return sites;
  };

  // What the town gets besides houses, and after how many steps: shops every
  // now and then, and a park and a stadium if it didn't start with one
  const startsWith = (variant: number) =>
    world.houses.some(
      (house) => house.town === town.id && house.variant === variant
    );
  const places: { variant: number; after: number; tries: number }[] = [];
  for (
    let after = 15 + rng() * 30;
    places.length < 4;
    after += 40 + rng() * 40
  ) {
    places.push({ variant: SHOPS, after, tries: 1 });
  }
  places.push({
    variant: PARK,
    after: startsWith(PARK) ? 150 + rng() * 60 : 25 + rng() * 50,
    tries: 2,
  });
  if (!startsWith(STADIUM)) {
    places.push({ variant: STADIUM, after: 50 + rng() * 80, tries: 4 });
  }
  places.sort((a, b) => a.after - b.after);

  const pick = (options: { tile: number; weight: number }[]) => {
    let total = 0;
    for (const option of options) {
      total += option.weight;
    }
    let roll = rng() * total;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        return option.tile;
      }
    }
    return options[options.length - 1].tile;
  };

  const steps: GrowthStep[] = [];
  for (let turn = 0; steps.length < MAX_STEPS; turn++) {
    const progress = Math.min(1, turn / STEPS_TO_FULL_HEIGHT);

    const place = places[0];
    if (place && steps.length >= place.after) {
      const sites = sitesFor(place.variant);
      place.tries--;
      if (sites.length > 0) {
        const tile = pick(sites);
        for (const covered of buildingTiles(size, tile, place.variant)) {
          tiers[covered] = place.variant;
        }
        steps.push({ kind: "place", tile, variant: place.variant });
        places.shift();
        continue;
      }
      // No room for it yet: try again when the town is a bit bigger
      place.after += 25;
      if (place.tries <= 0) {
        places.shift();
      }
      places.sort((a, b) => a.after - b.after);
    }
    const lots: { tile: number; weight: number }[] = [];
    const upgrades: { tile: number; weight: number }[] = [];
    const streetEnds: { tile: number; weight: number }[] = [];

    for (const tile of everywhere) {
      if (streets[tile]) {
        continue;
      }
      const far = distance(tile);
      if (lines[tile]) {
        const score = streetScore(tile);
        if (score > 0) {
          streetEnds.push({ tile, weight: score / (1 + far / 4) });
        }
        continue;
      }
      if (tiers[tile] >= 0) {
        if (tiers[tile] < tallest(tile, progress)) {
          upgrades.push({ tile, weight: 1 / (1 + far) });
        }
      } else if (
        isStreet(neighbor(tile, 1, 0)) ||
        isStreet(neighbor(tile, -1, 0)) ||
        isStreet(neighbor(tile, 0, 1)) ||
        isStreet(neighbor(tile, 0, -1))
      ) {
        lots.push({ tile, weight: 1 / (1 + (far * far) / 6) });
      }
    }

    // New streets when the town runs out of room, houses and bigger
    // buildings the rest of the time
    const roll = rng();
    let kind: GrowthStep["kind"] | null = null;
    if (streetEnds.length > 0 && (lots.length < 4 || roll < 0.08)) {
      kind = "street";
    } else if (lots.length > 0 && (roll < 0.45 || upgrades.length === 0)) {
      kind = "house";
    } else if (upgrades.length > 0) {
      kind = "upgrade";
    } else if (streetEnds.length > 0) {
      kind = "street";
    }

    if (kind === null) {
      if (progress >= 1) {
        break;
      }
      continue;
    }

    if (kind === "street") {
      const tile = pick(streetEnds);
      streets[tile] = 1;
      steps.push({ kind, tile });
    } else if (kind === "house") {
      const tile = pick(lots);
      tiers[tile] = 0;
      steps.push({ kind, tile });
    } else {
      const tile = pick(upgrades);
      tiers[tile]++;
      steps.push({ kind, tile });
    }
  }
  return steps;
}

// What a town's growth needs to work around: tiles with roads, railways or
// canals that players built, the stations a street can't run through (train
// stations and docks), and tiles where a house was demolished
export type Built = {
  tracks: ReadonlySet<number>;
  noStreets: ReadonlySet<number>;
  demolished: ReadonlySet<number>;
};

// The world, with each town grown by the given number of steps. Players
// always win over towns: nothing appears where they built, and a house they
// demolished stays gone. `world` has to be the world as generated from its
// seed, which is left untouched.
export function growWorld(
  world: World,
  steps: readonly number[],
  built: Built
): World {
  const { size } = world;
  const townRoads = world.townRoads.slice();
  const trees = world.trees.slice();
  const tiers = new Int8Array(size * size).fill(-1);
  const townOf = new Uint8Array(size * size);

  for (const house of world.houses) {
    const tile = house.y * size + house.x;
    const gone = buildingTiles(size, tile, house.variant).some((covered) =>
      built.demolished.has(covered)
    );
    if (!gone) {
      tiers[tile] = house.variant;
      townOf[tile] = house.town;
    }
  }

  world.towns.forEach((_, town) => {
    const wanted = Math.floor(steps[town] ?? 0);
    if (wanted <= 0) {
      return;
    }
    const plan = townPlan(world, town);
    const count = Math.min(plan.length, wanted);
    for (let index = 0; index < count; index++) {
      const step = plan[index];
      const { kind, tile } = step;
      if (kind === "street") {
        if (!built.noStreets.has(tile)) {
          townRoads[tile] = 1;
          trees[tile] = 0;
        }
      } else if (kind === "house") {
        if (!built.tracks.has(tile) && !built.demolished.has(tile)) {
          tiers[tile] = 0;
          townOf[tile] = town;
          trees[tile] = 0;
        }
      } else if (kind === "place") {
        const tiles = buildingTiles(size, tile, step.variant);
        const free = tiles.every(
          (covered) =>
            !built.tracks.has(covered) && !built.demolished.has(covered)
        );
        if (free) {
          for (const covered of tiles) {
            tiers[covered] = -1;
            trees[covered] = 0;
          }
          tiers[tile] = step.variant;
          townOf[tile] = town;
        }
      } else if (tiers[tile] >= 0 && tiers[tile] < MAX_TIER) {
        tiers[tile]++;
      }
    }
  });

  const houses: House[] = [];
  const houseAt = new Int16Array(size * size).fill(-1);
  const towns = world.towns.map((town) => ({ ...town, houses: 0 }));
  for (let tile = 0; tile < size * size; tile++) {
    if (tiers[tile] >= 0) {
      for (const covered of buildingTiles(size, tile, tiers[tile])) {
        houseAt[covered] = houses.length;
      }
      houses.push({
        x: tile % size,
        y: Math.floor(tile / size),
        variant: tiers[tile],
        town: townOf[tile],
      });
      towns[townOf[tile]].houses++;
    }
  }

  return { ...world, townRoads, trees, houseAt, houses, towns };
}

// Whether a tile this far from the center of a town is inside the circle
// that the town can grow to fill
function withinTown(dx: number, dy: number, margin = 0) {
  return Math.hypot(dx, dy) <= TOWN_RADIUS + 0.5 + margin;
}

// The town that a station on this tile helps grow, if it is in one or right
// next to it
export function stationTown(world: World, tile: number) {
  const x = tile % world.size;
  const y = Math.floor(tile / world.size);
  const town = nearestTown(world, x, y);
  const near = town !== null && withinTown(town.x - x, town.y - y, 1);
  return near ? town.id : null;
}

// The tiles of the stations that vehicles are running to. A vehicle that
// can't find a way to its next station isn't transporting anything.
export function servedStations(
  vehicles: Iterable<Pick<Vehicle, "stops" | "path">>
) {
  const served = new Set<number>();
  for (const vehicle of vehicles) {
    if (vehicle.path.length >= 2) {
      for (const stop of vehicle.stops) {
        served.add(Number(stop));
      }
    }
  }
  return [...served].sort((a, b) => a - b);
}

// How many of those stations each town has
export function townStations(world: World, stationTiles: Iterable<number>) {
  const counts = world.towns.map(() => 0);
  for (const tile of stationTiles) {
    const town = stationTown(world, tile);
    if (town !== null) {
      counts[town]++;
    }
  }
  return counts;
}

// Growth steps per minute of a small town with this many stations that
// vehicles call at. Without any, it doesn't grow.
export function townGrowthRate(stations: number) {
  return TOWN_GROWTH_PER_STATION * Math.min(stations, TOWN_MAX_STATIONS);
}

// The bigger a town gets, the slower it grows: a town that is `progress` of
// the way to its full size (0 to 1) grows at this fraction of its rate. That
// is close to full speed for a small town, a tenth of it at 80% of the way,
// and next to nothing for the last few buildings.
export function townGrowthPace(progress: number) {
  const left = 1 - Math.min(1, Math.max(0, progress)) ** 2;
  return left * left;
}

// How long it takes to get to `progress` at that pace, as a multiple of the
// time it would take to get all the way at full speed. This is the integral
// of 1 / townGrowthPace.
function growthEffort(progress: number) {
  return progress / (2 * (1 - progress * progress)) + Math.atanh(progress) / 2;
}

// The other way around: how far a town gets with that much time
function growthProgress(effort: number) {
  let low = 0;
  let high = 1;
  for (let round = 0; round < 40; round++) {
    const middle = (low + high) / 2;
    if (growthEffort(middle) < effort) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return low;
}

// How many steps a town has grown by now, out of the `capacity` steps it
// takes to be fully grown. `saved` is the town's entry in Storage, written
// the last time the number of stations that vehicles call at changed. A
// town without one never had any, so it never grew.
export function townGrowth(
  saved: TownGrowth | undefined,
  capacity: number,
  now: number
) {
  if (!saved) {
    return 0;
  }
  const rate = townGrowthRate(saved.stations);
  if (rate === 0 || saved.steps >= capacity) {
    return Math.min(saved.steps, capacity);
  }
  const minutes = Math.max(0, now - saved.at) / 60_000;
  const effort =
    growthEffort(saved.steps / capacity) + (rate * minutes) / capacity;
  return capacity * growthProgress(effort);
}

// The same for a town on the map, which only needs planning once it grows.
// `world` has to be the world as generated from its seed.
export function townSteps(
  world: World,
  town: number,
  saved: TownGrowth | undefined,
  now: number
) {
  if (!saved || (saved.steps <= 0 && saved.stations === 0)) {
    return 0;
  }
  return townGrowth(saved, townPlan(world, town).length, now);
}

export type TownStats = {
  population: number;
  buildings: number;
  // Index into `BUILDINGS` of the town's tallest building
  tallest: number;
  // How many it has of each kind of building, in the order of `BUILDINGS`
  counts: number[];
};

const statsCache = new WeakMap<World, TownStats[]>();

// A town's population is the number of people living in its buildings
export function townStats(world: World) {
  let stats = statsCache.get(world);
  if (!stats) {
    stats = world.towns.map(() => ({
      population: 0,
      buildings: 0,
      tallest: 0,
      counts: BUILDINGS.map(() => 0),
    }));
    for (const house of world.houses) {
      const town = stats[house.town];
      town.buildings++;
      town.counts[house.variant]++;
      if (house.variant < BUILDING_TIERS) {
        town.population += peopleIn(house);
        town.tallest = Math.max(town.tallest, house.variant);
      }
    }
    statsCache.set(world, stats);
  }
  return stats;
}
