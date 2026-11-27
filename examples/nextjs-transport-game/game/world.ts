import { BUILDINGS, CHURCH, PARK, SHOPS, STADIUM } from "./constants";
import { createRng, type Rng } from "./rng";
import type { Cargo } from "./types";

export const WATER = 0;
export const GRASS = 1;
export const SAND = 2;

export type IndustryType =
  | "coal_mine"
  | "power_station"
  | "forest"
  | "sawmill"
  | "farm"
  | "factory"
  | "oil_wells"
  | "refinery";

export const INDUSTRY: Record<
  IndustryType,
  {
    label: string;
    produces?: Cargo;
    // Units produced per second
    rate?: number;
    accepts?: Cargo;
  }
> = {
  coal_mine: { label: "Coal Mine", produces: "coal", rate: 1.1 },
  power_station: { label: "Power Station", accepts: "coal" },
  forest: { label: "Forest", produces: "wood", rate: 0.9 },
  sawmill: { label: "Sawmill", accepts: "wood" },
  farm: { label: "Farm", produces: "grain", rate: 0.8 },
  factory: { label: "Factory", accepts: "grain" },
  oil_wells: { label: "Oil Wells", produces: "oil", rate: 1 },
  refinery: { label: "Oil Refinery", accepts: "oil" },
};

// Industries cover a square of this many tiles
export const INDUSTRY_SIZE = 2;

export type Town = {
  id: number;
  name: string;
  x: number;
  y: number;
  houses: number;
  // How far apart the town's streets are: one runs north-south every
  // `blockX` tiles, and one east-west every `blockY` tiles
  blockX: number;
  blockY: number;
};

// Towns are laid out as a grid of streets around their center, with blocks
// of buildings in between. This tells which streets of that grid can run
// through a tile: buildings only go where none can.
export function streetLines(town: Town, x: number, y: number) {
  return {
    northSouth: (x - town.x) % town.blockX === 0,
    eastWest: (y - town.y) % town.blockY === 0,
  };
}

export type Industry = {
  id: number;
  type: IndustryType;
  name: string;
  // Top corner of its footprint
  x: number;
  y: number;
};

export type House = {
  // Its top corner, for the few buildings that cover more than one tile
  x: number;
  y: number;
  // Index into `BUILDINGS`
  variant: number;
  town: number;
};

// The tiles a building of this kind covers, from its top corner
export function buildingTiles(size: number, tile: number, variant: number) {
  const side = BUILDINGS[variant].size ?? 1;
  const tiles: number[] = [];
  for (let dy = 0; dy < side; dy++) {
    for (let dx = 0; dx < side; dx++) {
      tiles.push(tile + dy * size + dx);
    }
  }
  return tiles;
}

// The part of the game players don't build: terrain, towns, and industries.
// It is never stored in Liveblocks. Every client generates the exact same
// world from the `seed` in Storage, so only what players build has to be
// synced. Towns then grow from there: see `growWorld` in `towns.ts`.
export type World = {
  seed: number;
  size: number;
  terrain: Uint8Array;
  // Per-tile random value, used to vary how tiles are drawn
  shade: Uint8Array;
  // Number of trees on each tile
  trees: Uint8Array;
  // Streets that belong to towns. Anyone can drive on them.
  townRoads: Uint8Array;
  // Index into `houses` / `industries`, or -1
  houseAt: Int16Array;
  industryAt: Int16Array;
  towns: Town[];
  industries: Industry[];
  houses: House[];
};

const TOWN_PREFIXES = [
  "Tun",
  "Bran",
  "Fled",
  "Grin",
  "Sud",
  "War",
  "Pen",
  "Nor",
  "Dar",
  "Hart",
  "Mar",
  "Wren",
  "Car",
  "Ful",
  "Lin",
  "Pad",
  "Gad",
  "Ches",
  "Ket",
  "Brid",
];

const TOWN_SUFFIXES = [
  "ford",
  "bury",
  "ton",
  "wood",
  "ham",
  "stone",
  "well",
  "field",
  "hill",
  "ville",
  "mouth",
  "borough",
  "ley",
  "ingham",
  "bridge",
];

const CONSUMERS: IndustryType[] = [
  "power_station",
  "sawmill",
  "factory",
  "refinery",
];
const PRODUCERS: IndustryType[] = [
  "coal_mine",
  "coal_mine",
  "forest",
  "forest",
  "farm",
  "farm",
  "oil_wells",
];

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(rng: Rng, size: number, cell: number): Float32Array {
  const n = Math.ceil(size / cell) + 2;
  const lattice = new Float32Array(n * n);
  for (let i = 0; i < lattice.length; i++) {
    lattice[i] = rng();
  }

  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = x / cell;
      const gy = y / cell;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = smooth(gx - x0);
      const ty = smooth(gy - y0);
      const a = lattice[y0 * n + x0];
      const b = lattice[y0 * n + x0 + 1];
      const c = lattice[(y0 + 1) * n + x0];
      const d = lattice[(y0 + 1) * n + x0 + 1];
      out[y * size + x] =
        (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

export function tileX(world: { size: number }, tile: number) {
  return tile % world.size;
}

export function tileY(world: { size: number }, tile: number) {
  return Math.floor(tile / world.size);
}

export function isBlocked(world: World, tile: number) {
  return world.houseAt[tile] >= 0 || world.industryAt[tile] >= 0;
}

export function nearestTown(world: World, x: number, y: number): Town | null {
  return world.towns.length > 0 ? nearestTownOf(world.towns, x, y) : null;
}

// Bigger maps have the same kind of landscape, and more of everything on
// it. `size` is the length of a side, in tiles.
export function generateWorld(seed: number, size: number): World {
  const count = size * size;
  // How many times bigger than the smallest map this one is
  const scale = count / (64 * 64);
  const rng = createRng(seed);

  const terrain = new Uint8Array(count);
  const shade = new Uint8Array(count);
  const trees = new Uint8Array(count);
  const townRoads = new Uint8Array(count);
  const houseAt = new Int16Array(count).fill(-1);
  const industryAt = new Int16Array(count).fill(-1);
  const towns: Town[] = [];
  const industries: Industry[] = [];
  const houses: House[] = [];

  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < size && y < size;

  // Terrain. The lowest fifth of the height map becomes water.
  const large = valueNoise(rng, size, 18);
  const medium = valueNoise(rng, size, 8);
  const small = valueNoise(rng, size, 4);
  const height = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    height[i] = 0.55 * large[i] + 0.3 * medium[i] + 0.15 * small[i];
    shade[i] = Math.floor(rng() * 256);
  }
  const waterLevel = Float32Array.from(height).sort()[Math.floor(count * 0.2)];
  for (let i = 0; i < count; i++) {
    terrain[i] = height[i] < waterLevel ? WATER : GRASS;
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (terrain[i] === WATER) {
        continue;
      }
      const nearWater =
        (inBounds(x + 1, y) && terrain[i + 1] === WATER) ||
        (inBounds(x - 1, y) && terrain[i - 1] === WATER) ||
        (inBounds(x, y + 1) && terrain[i + size] === WATER) ||
        (inBounds(x, y - 1) && terrain[i - size] === WATER);
      if (nearWater) {
        terrain[i] = SAND;
      }
    }
  }

  // Woodland
  const woodland = valueNoise(rng, size, 7);
  for (let i = 0; i < count; i++) {
    if (terrain[i] !== GRASS) {
      continue;
    }
    if (woodland[i] > 0.62) {
      trees[i] = 1 + Math.floor(rng() * 3);
    } else if (rng() < 0.04) {
      trees[i] = 1;
    }
  }

  // Towns
  const usedNames = new Set<string>();
  const townStreets: number[][] = [];
  const townCount = Math.round(7 * scale);
  for (
    let attempt = 0;
    attempt < 800 * scale && towns.length < townCount;
    attempt++
  ) {
    const x = 7 + Math.floor(rng() * (size - 14));
    const y = 7 + Math.floor(rng() * (size - 14));
    if (terrain[y * size + x] === WATER) {
      continue;
    }
    if (towns.some((town) => Math.hypot(town.x - x, town.y - y) < 14)) {
      continue;
    }
    let land = 0;
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (terrain[(y + dy) * size + x + dx] !== WATER) {
          land++;
        }
      }
    }
    if (land < 73) {
      continue;
    }

    let name = "";
    do {
      name =
        TOWN_PREFIXES[Math.floor(rng() * TOWN_PREFIXES.length)] +
        TOWN_SUFFIXES[Math.floor(rng() * TOWN_SUFFIXES.length)];
    } while (usedNames.has(name));
    usedNames.add(name);

    const streets: number[] = [];
    const layStreet = (
      fromX: number,
      fromY: number,
      dx: number,
      dy: number,
      length: number
    ) => {
      for (let step = 0; step <= length; step++) {
        const sx = fromX + dx * step;
        const sy = fromY + dy * step;
        if (!inBounds(sx, sy) || terrain[sy * size + sx] === WATER) {
          return;
        }
        const tile = sy * size + sx;
        if (!townRoads[tile]) {
          townRoads[tile] = 1;
          streets.push(tile);
        }
      }
    };

    // Blocks are two buildings deep, so every building is on a street, and
    // a few buildings long. Which way they lie differs per town.
    const long = 4 + Math.floor(rng() * 3);
    const sideStreetsAlongX = rng() < 0.5;

    // Two main streets cross in the center
    layStreet(x, y, 1, 0, 3 + Math.floor(rng() * 3));
    layStreet(x, y, -1, 0, 3 + Math.floor(rng() * 3));
    layStreet(x, y, 0, 1, 3 + Math.floor(rng() * 2));
    layStreet(x, y, 0, -1, 3 + Math.floor(rng() * 2));
    // And most towns start with a side street or two, one block away
    for (const side of [-1, 1]) {
      if (rng() > 0.7) {
        continue;
      }
      const [dx, dy] = sideStreetsAlongX ? [1, 0] : [0, 1];
      const cornerX = x + dy * side * 3;
      const cornerY = y + dx * side * 3;
      if (inBounds(cornerX, cornerY) && townRoads[cornerY * size + cornerX]) {
        layStreet(cornerX, cornerY, dx, dy, 1 + Math.floor(rng() * 3));
        layStreet(cornerX, cornerY, -dx, -dy, 1 + Math.floor(rng() * 3));
      }
    }

    towns.push({
      id: towns.length,
      name,
      x,
      y,
      houses: 0,
      blockX: sideStreetsAlongX ? long : 3,
      blockY: sideStreetsAlongX ? 3 : long,
    });
    townStreets.push(streets);
  }

  // Some towns have a stadium from the start, at the edge of town. The
  // others get one when they have grown for a while.
  for (const town of towns) {
    if (rng() > 0.35) {
      continue;
    }
    const sites: number[] = [];
    for (let dy = -5; dy <= 4; dy++) {
      for (let dx = -5; dx <= 4; dx++) {
        const corner = (town.y + dy) * size + town.x + dx;
        const tiles = buildingTiles(size, corner, STADIUM);
        const fits = tiles.every((tile) => {
          const lines = streetLines(town, tile % size, Math.floor(tile / size));
          return (
            terrain[tile] !== WATER &&
            houseAt[tile] < 0 &&
            !lines.northSouth &&
            !lines.eastWest
          );
        });
        const onStreet = tiles.some(
          (tile) =>
            townRoads[tile - 1] ||
            townRoads[tile + 1] ||
            townRoads[tile - size] ||
            townRoads[tile + size]
        );
        const central = dx >= -2 && dx <= 1 && dy >= -2 && dy <= 1;
        if (fits && onStreet && !central) {
          sites.push(corner);
        }
      }
    }
    if (sites.length > 0) {
      const corner = sites[Math.floor(rng() * sites.length)];
      for (const tile of buildingTiles(size, corner, STADIUM)) {
        houseAt[tile] = houses.length;
      }
      houses.push({
        x: corner % size,
        y: Math.floor(corner / size),
        variant: STADIUM,
        town: town.id,
      });
      town.houses++;
    }
  }

  // Houses line the streets, and get taller toward the town center. They
  // keep off the tiles where the town's streets will run as it grows.
  towns.forEach((town, townIndex) => {
    const first = houses.length;
    for (const street of townStreets[townIndex]) {
      const sx = street % size;
      const sy = Math.floor(street / size);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const hx = sx + dx;
          const hy = sy + dy;
          if ((dx === 0 && dy === 0) || !inBounds(hx, hy)) {
            continue;
          }
          const tile = hy * size + hx;
          const lines = streetLines(town, hx, hy);
          if (
            terrain[tile] === WATER ||
            houseAt[tile] >= 0 ||
            lines.northSouth ||
            lines.eastWest
          ) {
            continue;
          }
          const chance = dx === 0 || dy === 0 ? 0.8 : 0.45;
          if (rng() > chance) {
            continue;
          }
          const distance = Math.max(
            Math.abs(hx - town.x),
            Math.abs(hy - town.y)
          );
          const roll = rng();
          let variant = roll < 0.15 ? 1 : 0;
          if (distance <= 1) {
            variant = roll < 0.7 ? 2 : 1;
          } else if (distance <= 3) {
            variant = roll < 0.6 ? 1 : 0;
          }
          houseAt[tile] = houses.length;
          houses.push({ x: hx, y: hy, variant, town: town.id });
          town.houses++;
        }
      }
    }

    // A few of them are not houses: every town has a church and shops near
    // its center, and most have a park
    const places = [CHURCH, SHOPS];
    if (rng() < 0.5) {
      places.push(SHOPS);
    }
    if (rng() < 0.6) {
      places.push(PARK);
    }
    for (const variant of places) {
      const reach = variant === PARK ? 4 : 2;
      const choices = houses
        .slice(first)
        .filter(
          (house) =>
            house.variant <= 1 &&
            Math.max(Math.abs(house.x - town.x), Math.abs(house.y - town.y)) <=
              reach
        );
      if (choices.length > 0) {
        choices[Math.floor(rng() * choices.length)].variant = variant;
      }
    }
  });

  // Industries
  const canPlaceIndustry = (x: number, y: number) => {
    for (let dy = -2; dy < INDUSTRY_SIZE + 2; dy++) {
      for (let dx = -2; dx < INDUSTRY_SIZE + 2; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (!inBounds(px, py)) {
          return false;
        }
        const tile = py * size + px;
        if (townRoads[tile] || houseAt[tile] >= 0) {
          return false;
        }
        const inFootprint =
          dx >= 0 && dy >= 0 && dx < INDUSTRY_SIZE && dy < INDUSTRY_SIZE;
        if (inFootprint && terrain[tile] === WATER) {
          return false;
        }
      }
    }
    return industries.every(
      (other) => Math.max(Math.abs(other.x - x), Math.abs(other.y - y)) >= 7
    );
  };

  // Every round of the plan adds one more set of industries. Consumers come
  // first, so producers can be placed far away from them.
  const rounds = Math.max(1, Math.round(scale));
  const plan = [CONSUMERS, PRODUCERS].flatMap((types) =>
    Array.from({ length: rounds }, () => types).flat()
  );
  for (const type of plan) {
    const produces = INDUSTRY[type].produces;
    const consumers = industries.filter(
      (other) => produces && INDUSTRY[other.type].accepts === produces
    );

    for (let attempt = 0; attempt < 1200; attempt++) {
      const x = 3 + Math.floor(rng() * (size - 8));
      const y = 3 + Math.floor(rng() * (size - 8));
      if (!canPlaceIndustry(x, y)) {
        continue;
      }
      // Keep producers a decent trip away from whoever buys their cargo.
      // Relax the rule if the map is too cramped to satisfy it.
      const minDistance = attempt < 800 ? 16 : 8;
      if (
        consumers.some(
          (other) => Math.abs(other.x - x) + Math.abs(other.y - y) < minDistance
        )
      ) {
        continue;
      }

      const id = industries.length;
      const town = towns.length > 0 ? nearestTownOf(towns, x, y) : null;
      industries.push({
        id,
        type,
        name: `${town ? `${town.name} ` : ""}${INDUSTRY[type].label}`,
        x,
        y,
      });
      for (let dy = 0; dy < INDUSTRY_SIZE; dy++) {
        for (let dx = 0; dx < INDUSTRY_SIZE; dx++) {
          industryAt[(y + dy) * size + x + dx] = id;
        }
      }
      break;
    }
  }

  // Nothing grows on streets or under buildings
  for (let i = 0; i < count; i++) {
    if (townRoads[i] || houseAt[i] >= 0 || industryAt[i] >= 0) {
      trees[i] = 0;
    }
  }

  return {
    seed,
    size,
    terrain,
    shade,
    trees,
    townRoads,
    houseAt,
    industryAt,
    towns,
    industries,
    houses,
  };
}

function nearestTownOf(towns: Town[], x: number, y: number): Town {
  let best = towns[0];
  for (const town of towns) {
    if (
      Math.hypot(town.x - x, town.y - y) < Math.hypot(best.x - x, best.y - y)
    ) {
      best = town;
    }
  }
  return best;
}
