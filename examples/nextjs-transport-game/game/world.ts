import { MAP_SIZE } from "./constants";
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
};

export type Industry = {
  id: number;
  type: IndustryType;
  name: string;
  // Top corner of its footprint
  x: number;
  y: number;
};

export type House = {
  x: number;
  y: number;
  // Index into `BUILDINGS`, from 0 (cottage) to 4 (skyscraper)
  variant: number;
  town: number;
};

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

const INDUSTRY_PLAN: IndustryType[] = [
  // Consumers first, so producers can be placed far away from them
  "power_station",
  "sawmill",
  "factory",
  "refinery",
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

export function generateWorld(seed: number): World {
  const size = MAP_SIZE;
  const count = size * size;
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
  for (let attempt = 0; attempt < 800 && towns.length < 7; attempt++) {
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

    layStreet(x, y, 1, 0, 3 + Math.floor(rng() * 3));
    layStreet(x, y, -1, 0, 3 + Math.floor(rng() * 3));
    layStreet(x, y, 0, 1, 2 + Math.floor(rng() * 3));
    layStreet(x, y, 0, -1, 2 + Math.floor(rng() * 3));
    for (const side of [-1, 1]) {
      if (rng() < 0.6) {
        const offset = side * (2 + Math.floor(rng() * 2));
        layStreet(x + offset, y, 0, 1, 1 + Math.floor(rng() * 3));
        layStreet(x + offset, y, 0, -1, 1 + Math.floor(rng() * 3));
      }
    }

    towns.push({ id: towns.length, name, x, y, houses: 0 });
    townStreets.push(streets);
  }

  // Houses line the streets, and get taller toward the town center
  towns.forEach((town, townIndex) => {
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
          if (
            terrain[tile] === WATER ||
            townRoads[tile] ||
            houseAt[tile] >= 0
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

  for (const type of INDUSTRY_PLAN) {
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
          (other) =>
            Math.abs(other.x - x) + Math.abs(other.y - y) < minDistance
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
