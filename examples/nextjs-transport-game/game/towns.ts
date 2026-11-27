import {
  BUILDING_TIERS,
  BUILDINGS,
  PARK,
  SHOPS,
  STADIUM,
  TOWN_GROWTH_PER_MINUTE,
  TOWN_GROWTH_PER_STATION,
  TOWN_MAX_STATIONS,
  TOWN_RADIUS,
} from "./constants";
import { createRng, hashInt } from "./rng";
import type { TownGrowth } from "./types";
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
// town is only depends on the clock and on the stations around it. So all
// players see the same buildings appear at the same time, without anyone
// writing them to Storage.

export type GrowthStep =
  | { kind: "street" | "house" | "upgrade"; tile: number }
  // Shops, a park or a stadium, as an index into `BUILDINGS`. It takes the
  // place of the small houses that are in its way.
  | { kind: "place"; tile: number; variant: number };

const MAX_TIER = BUILDING_TIERS - 1;
// Buildings are allowed to get taller as a town moves through its first
// steps. After this many, the only thing left is to catch up.
const STEPS_TO_FULL_HEIGHT = 240;
const MAX_STEPS = 600;
// How good a tile is for more street: making a street longer is better than
// starting a new one at a corner (which scores 1), and closing a gap between
// two pieces of the same street is best
const STREET_END = 3;
const STREET_GAP = 6;
// The two streets through the center of a town grow faster than the others
const MAIN_STREET = 1.5;

const plans = new WeakMap<World, GrowthStep[][]>();

// The growth steps of every town, in order. `world` has to be the world as
// generated from its seed, not one that already grew.
export function townPlans(world: World) {
  let result = plans.get(world);
  if (!result) {
    // Towns are planned one after the other on the same scratch copy of the
    // map, so they keep out of each other's way
    const streets = world.townRoads.slice();
    const tiers = new Int8Array(world.size * world.size).fill(-1);
    for (const house of world.houses) {
      const corner = house.y * world.size + house.x;
      for (const tile of buildingTiles(world.size, corner, house.variant)) {
        tiers[tile] = house.variant;
      }
    }
    result = world.towns.map((town) => planTown(world, town, streets, tiers));
    plans.set(world, result);
  }
  return result;
}

function planTown(
  world: World,
  town: Town,
  streets: Uint8Array,
  tiers: Int8Array
) {
  const { size } = world;
  const rng = createRng(hashInt(world.seed + (town.id + 1) * 7919));

  const neighbor = (tile: number, dx: number, dy: number) => {
    const x = (tile % size) + dx;
    const y = Math.floor(tile / size) + dy;
    return x < 0 || y < 0 || x >= size || y >= size ? -1 : y * size + x;
  };
  const isStreet = (tile: number) => tile >= 0 && streets[tile] === 1;
  const distance = (tile: number) =>
    Math.max(
      Math.abs((tile % size) - town.x),
      Math.abs(Math.floor(tile / size) - town.y)
    );

  // Where this town can grow: dry land around its center that is closer to
  // it than to any other town
  const area: number[] = [];
  for (let dy = -TOWN_RADIUS; dy <= TOWN_RADIUS; dy++) {
    for (let dx = -TOWN_RADIUS; dx <= TOWN_RADIUS; dx++) {
      const tile = neighbor(town.y * size + town.x, dx, dy);
      if (
        tile >= 0 &&
        world.terrain[tile] !== WATER &&
        world.industryAt[tile] < 0 &&
        nearestTown(world, tile % size, Math.floor(tile / size)) === town
      ) {
        area.push(tile);
      }
    }
  }

  // The tallest building a tile can have. Buildings get taller toward the
  // center, and everywhere as the town gets older.
  const tallest = (tile: number, progress: number) => {
    const variation = (hashInt(tile * 31 + world.seed) % 100) / 100;
    const tier =
      1.6 + 2.6 * progress - 0.7 * Math.max(0, distance(tile) - 1) + variation;
    return Math.max(0, Math.min(MAX_TIER, Math.floor(tier)));
  };

  const linesAt = (tile: number) =>
    streetLines(town, tile % size, Math.floor(tile / size));

  // How good a tile is for a new piece of street, or 0 if it can't have one.
  // Streets only follow the lines of the town's grid, and only get there
  // from a street that is already on that line or crosses it.
  const streetScore = (tile: number) => {
    const { northSouth, eastWest } = linesAt(tile);
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
      const free = tiles.every((tile) => {
        const lines = linesAt(tile);
        return (
          inArea.has(tile) &&
          !streets[tile] &&
          !lines.northSouth &&
          !lines.eastWest &&
          tiers[tile] <= 1
        );
      });
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

    for (const tile of area) {
      if (streets[tile]) {
        continue;
      }
      const far = distance(tile);
      const lines = linesAt(tile);
      if (lines.northSouth || lines.eastWest) {
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

  townPlans(world).forEach((plan, town) => {
    const count = Math.min(plan.length, Math.floor(steps[town] ?? 0));
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

// The town that a station on this tile helps grow, if it is close to one
export function stationTown(world: World, tile: number) {
  const x = tile % world.size;
  const y = Math.floor(tile / world.size);
  const town = nearestTown(world, x, y);
  const near =
    town !== null &&
    Math.max(Math.abs(town.x - x), Math.abs(town.y - y)) <= TOWN_RADIUS + 1;
  return near ? town.id : null;
}

// How many stations each town has around it
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

// Growth steps per minute of a town with this many stations around it
export function townGrowthRate(stations: number) {
  return (
    TOWN_GROWTH_PER_MINUTE +
    TOWN_GROWTH_PER_STATION * Math.min(stations, TOWN_MAX_STATIONS)
  );
}

// How many steps a town has grown by now. `saved` is the town's entry in
// Storage, written the last time the number of stations around it changed.
// A town without one has been growing on its own since the map started.
export function townGrowth(
  saved: TownGrowth | undefined,
  startedAt: number,
  now: number
) {
  const from = saved ?? { steps: 0, at: startedAt, stations: 0 };
  const minutes = Math.max(0, now - from.at) / 60_000;
  return from.steps + townGrowthRate(from.stations) * minutes;
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
      const { residents } = BUILDINGS[house.variant];
      const town = stats[house.town];
      town.buildings++;
      town.counts[house.variant]++;
      if (house.variant < BUILDING_TIERS) {
        const variation = hashInt(house.x * 131 + house.y) % (residents >> 1);
        town.population += residents + variation;
        town.tallest = Math.max(town.tallest, house.variant);
      }
    }
    statsCache.set(world, stats);
  }
  return stats;
}
