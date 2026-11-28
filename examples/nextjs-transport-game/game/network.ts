import type { DepotData, SignalData, Transport } from "./types";
import { WATER, type World } from "./world";

// Which tiles have a road or a railway on them, including the streets that
// towns start with, and which tiles ships can sail on: the water the map
// came with, and the canals players dug. Rebuilt from Storage whenever
// someone builds something.
export type Network = {
  size: number;
  road: Uint8Array;
  rail: Uint8Array;
  canal: Uint8Array;
  water: Uint8Array;
  // For every railway tile, the sides its track runs to, as direction bits.
  // Trains get from one tile to the next only where both run to each other.
  links: Uint8Array;
  // The same, plus the short piece of track that leads into an engine
  // shed: what is drawn
  arms: Uint8Array;
  // Tile → the signal beside its track
  signals: ReadonlyMap<number, SignalData>;
  // Tile → the depot on it
  depots: ReadonlyMap<number, DepotData>;
};

export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;
export const SIDES: readonly number[] = [NORTH, EAST, SOUTH, WEST];

export function opposite(side: number) {
  return side === NORTH
    ? SOUTH
    : side === SOUTH
      ? NORTH
      : side === EAST
        ? WEST
        : EAST;
}

// The tile next to `tile` on that side, or -1 past the edge of the map
export function neighbor(size: number, tile: number, side: number) {
  const x = tile % size;
  if (side === NORTH) {
    return tile >= size ? tile - size : -1;
  }
  if (side === SOUTH) {
    return tile + size < size * size ? tile + size : -1;
  }
  if (side === EAST) {
    return x < size - 1 ? tile + 1 : -1;
  }
  return x > 0 ? tile - 1 : -1;
}

// Which side of `from` the tile `to` is on. They must be next to each
// other.
export function sideToward(size: number, from: number, to: number) {
  const step = to - from;
  return step === -size
    ? NORTH
    : step === size
      ? SOUTH
      : step === 1
        ? EAST
        : WEST;
}

// A number from 0 to 3 for each side, for packing sides into keys
export function sideIndex(side: number) {
  return side === NORTH ? 0 : side === EAST ? 1 : side === SOUTH ? 2 : 3;
}

export function buildNetwork(
  world: World,
  roads: Iterable<string>,
  rails: Iterable<string>,
  canals: Iterable<string>,
  railLinks: Readonly<Record<string, number>> = {},
  signals: Readonly<Record<string, SignalData>> = {},
  depots: Readonly<Record<string, DepotData>> = {}
): Network {
  const { size } = world;
  const road = Uint8Array.from(world.townRoads);
  const rail = new Uint8Array(size * size);
  for (const key of roads) {
    road[Number(key)] = 1;
  }
  for (const key of rails) {
    rail[Number(key)] = 1;
  }
  const canal = new Uint8Array(size * size);
  const water = world.terrain.map((terrain) => (terrain === WATER ? 1 : 0));
  for (const key of canals) {
    canal[Number(key)] = 1;
    water[Number(key)] = 1;
  }

  // Two railway tiles are joined when each runs to the other
  const links = new Uint8Array(size * size);
  for (const [key, sides] of Object.entries(railLinks)) {
    const tile = Number(key);
    if (!rail[tile]) {
      continue;
    }
    for (const side of SIDES) {
      const other = neighbor(size, tile, side);
      if (
        sides & side &&
        other >= 0 &&
        rail[other] &&
        (railLinks[other] ?? 0) & opposite(side)
      ) {
        links[tile] |= side;
      }
    }
  }

  const arms = Uint8Array.from(links);
  const depotMap = new Map<number, DepotData>();
  for (const [key, depot] of Object.entries(depots)) {
    const tile = Number(key);
    depotMap.set(tile, depot);
    const exit = neighbor(size, tile, depot.side);
    if (depot.kind === "rail" && exit >= 0 && rail[exit]) {
      arms[exit] |= opposite(depot.side);
    }
  }

  const signalMap = new Map<number, SignalData>();
  for (const [key, signal] of Object.entries(signals)) {
    // A signal only means something where its track still runs
    const side = signal.side & links[Number(key)];
    if (side) {
      signalMap.set(Number(key), { ...signal, side });
    }
  }

  return {
    size,
    road,
    rail,
    canal,
    water,
    links,
    arms,
    signals: signalMap,
    depots: depotMap,
  };
}

export function gridOf(network: Network, kind: Transport) {
  return network[kind];
}

// Bitmask of the neighbors a road tile connects to: every adjacent tile
// that has a road too
export function connectionsAt(grid: Uint8Array, size: number, tile: number) {
  let mask = 0;
  for (const side of SIDES) {
    const other = neighbor(size, tile, side);
    if (other >= 0 && grid[other]) {
      mask |= side;
    }
  }
  return mask;
}

// How many sides a mask has
export function countSides(mask: number) {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
}

// Shortest path over a grid from a tile to the nearest of some other tiles,
// as a list of tiles including both ends. Among equally short paths, it
// prefers the one with the fewest turns.
export function findPath(
  grid: Uint8Array,
  size: number,
  from: number,
  to: number | readonly number[]
): number[] | null {
  const goals = (typeof to === "number" ? [to] : to).filter(
    (tile) => grid[tile]
  );
  if (!grid[from] || goals.length === 0) {
    return null;
  }
  if (goals.includes(from)) {
    return [from];
  }

  // Breadth-first search outward from the destinations
  const distance = new Int32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  for (const goal of goals) {
    distance[goal] = 0;
    queue[tail++] = goal;
  }

  while (head < tail && distance[from] === -1) {
    const tile = queue[head++];
    const next = distance[tile] + 1;
    for (const side of SIDES) {
      const other = neighbor(size, tile, side);
      if (other >= 0 && grid[other] && distance[other] === -1) {
        distance[other] = next;
        queue[tail++] = other;
      }
    }
  }

  if (distance[from] === -1) {
    return null;
  }

  // Walk downhill toward a destination, going straight whenever possible
  const path = [from];
  let tile = from;
  let direction = 0;
  while (distance[tile] !== 0) {
    let chosen = -1;
    let chosenSide = 0;
    for (const side of SIDES) {
      const other = neighbor(size, tile, side);
      if (other >= 0 && distance[other] === distance[tile] - 1) {
        if (side === direction) {
          chosen = other;
          chosenSide = side;
          break;
        }
        if (chosen === -1) {
          chosen = other;
          chosenSide = side;
        }
      }
    }
    tile = chosen;
    direction = chosenSide;
    path.push(tile);
  }
  return path;
}

// Whether a train can go from a railway tile out of the given side. A
// one-way signal on the next tile that faces this way stops it.
export function canRun(network: Network, tile: number, side: number) {
  if (!(network.links[tile] & side)) {
    return false;
  }
  const signal = network.signals.get(neighbor(network.size, tile, side));
  return !(signal?.kind === "oneway" && signal.side & opposite(side));
}

// The cheapest way for a train from a tile to one of the tiles where
// `isGoal` holds, as a list of tiles including both ends. A train never
// turns around on the spot: one that is heading for `heading` (a side, or 0
// for a train that can leave either way) doesn't set off the other way.
// `isGoal` is given the side the train arrives from. Every tile costs 1,
// or less where the train turns and cuts the corner on a diagonal, plus
// whatever `extra` says: that keeps trains away from busy tracks.
export function findRailPath(
  network: Network,
  from: number,
  heading: number,
  isGoal: (tile: number, heading: number) => boolean,
  extra?: (tile: number) => number
): number[] | null {
  const { size } = network;
  const cost = new Map<number, number>([[from, 0]]);
  const previous = new Map<number, number>();
  const done = new Set<number>();
  // Railways are small next to the map: a plain list does for a queue
  const open = [from];

  while (open.length > 0) {
    let best = 0;
    for (let index = 1; index < open.length; index++) {
      if (cost.get(open[index])! < cost.get(open[best])!) {
        best = index;
      }
    }
    const tile = open[best];
    open[best] = open[open.length - 1];
    open.pop();
    if (done.has(tile)) {
      continue;
    }
    done.add(tile);

    const before = previous.get(tile);
    const arrived =
      before === undefined ? heading : sideToward(size, before, tile);
    if (before !== undefined && isGoal(tile, arrived)) {
      const path = [tile];
      let at = tile;
      while (previous.has(at)) {
        at = previous.get(at)!;
        path.push(at);
      }
      return path.reverse();
    }

    for (const side of SIDES) {
      if (
        (arrived !== 0 && side === opposite(arrived)) ||
        !canRun(network, tile, side)
      ) {
        continue;
      }
      const other = neighbor(size, tile, side);
      const length = arrived !== 0 && side !== arrived ? Math.SQRT1_2 : 1;
      const next = cost.get(tile)! + length + (extra?.(other) ?? 0);
      if (!done.has(other) && next < (cost.get(other) ?? Infinity)) {
        cost.set(other, next);
        previous.set(other, tile);
        open.push(other);
      }
    }
  }
  return null;
}

const blockCache = new WeakMap<Network, Map<number, readonly number[]>>();

// The block of track that starts at `tile` for a train that enters it from
// its `side`: every tile it could get to without passing a signal. Signals
// are where one block ends and the next one starts.
export function blockFrom(network: Network, tile: number, side: number) {
  let cache = blockCache.get(network);
  if (!cache) {
    cache = new Map();
    blockCache.set(network, cache);
  }
  const key = tile * 4 + sideIndex(side);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const { size, signals } = network;
  const block = [tile];
  const seen = new Set(block);
  for (let index = 0; index < block.length; index++) {
    const at = block[index];
    for (const out of SIDES) {
      const other = neighbor(size, at, out);
      if (
        !(network.links[at] & out) ||
        seen.has(other) ||
        (at === tile && out === side) ||
        (signals.get(at)?.side ?? 0) & out ||
        (signals.get(other)?.side ?? 0) & opposite(out)
      ) {
        continue;
      }
      seen.add(other);
      block.push(other);
    }
  }
  cache.set(key, block);
  return block;
}

// Whether a tile's track runs straight through it, or ends on it: what a
// platform needs
export function isStraight(mask: number) {
  return (mask & (NORTH | SOUTH)) === mask || (mask & (EAST | WEST)) === mask;
}

// The tiles of a straight line from a tile toward another one, along
// whichever way that one is further off: what dragging a platform builds
export function straightLine(size: number, from: number, to: number) {
  const dx = (to % size) - (from % size);
  const dy = Math.floor(to / size) - Math.floor(from / size);
  const along = Math.abs(dx) >= Math.abs(dy);
  const step = along ? Math.sign(dx) : Math.sign(dy) * size;
  const tiles = [from];
  for (let count = Math.abs(along ? dx : dy); count > 0; count--) {
    tiles.push(tiles[tiles.length - 1] + step);
  }
  return tiles;
}

// The tiles of a line between two tiles that runs straight for one part
// and diagonally for the other: what dragging a railway builds. A diagonal
// is a staircase of tiles, one step along and one step across at a time,
// and a train cuts the corner of every one of them. The straight part comes
// first, or the diagonal one when the line is flipped.
export function railLine(
  size: number,
  from: number,
  to: number,
  flipped = false
) {
  const dx = (to % size) - (from % size);
  const dy = Math.floor(to / size) - Math.floor(from / size);
  const wide = Math.abs(dx) >= Math.abs(dy);
  const along = wide ? Math.sign(dx) : Math.sign(dy) * size;
  const across = wide ? Math.sign(dy) * size : Math.sign(dx);
  const stairs = Math.min(Math.abs(dx), Math.abs(dy));
  const straight = Math.abs(Math.abs(dx) - Math.abs(dy));

  const tiles = [from];
  let tile = from;
  const step = (by: number) => {
    tile += by;
    tiles.push(tile);
  };
  const run = () => {
    for (let count = 0; count < straight; count++) {
      step(along);
    }
  };
  const climb = (first: number, second: number) => {
    for (let count = 0; count < stairs; count++) {
      step(first);
      step(second);
    }
  };

  if (flipped) {
    climb(along, across);
    run();
  } else {
    run();
    climb(across, along);
  }
  return tiles;
}

// The line that dragging a railway from one tile to another builds. Of the
// two ways to lay it, it is the one that runs over less of the track that
// is already there: a second diagonal right next to another one then lies
// beside it, not on top of it. `flipped` asks for the other one.
export function railDragLine(
  network: Network,
  from: number,
  to: number,
  flipped = false
) {
  const lines = [false, true].map((each) =>
    railLine(network.size, from, to, each)
  );
  const [straightFirst, diagonalFirst] = lines.map(
    (tiles) => tiles.slice(1, -1).filter((tile) => network.rail[tile]).length
  );
  const best = diagonalFirst < straightFirst ? 1 : 0;
  return lines[flipped ? 1 - best : best];
}

// The tiles of an L-shaped line between two tiles, used when dragging to
// build a road or a canal. The longer side of the L comes first, or the shorter one when the
// line is flipped, which puts its corner on the other side.
export function lineBetween(
  size: number,
  from: number,
  to: number,
  flipped = false
) {
  let x = from % size;
  let y = Math.floor(from / size);
  const toX = to % size;
  const toY = Math.floor(to / size);
  const tiles = [from];

  const alongX = () => {
    while (x !== toX) {
      x += Math.sign(toX - x);
      tiles.push(y * size + x);
    }
  };
  const alongY = () => {
    while (y !== toY) {
      y += Math.sign(toY - y);
      tiles.push(y * size + x);
    }
  };

  if (Math.abs(toX - x) >= Math.abs(toY - y) !== flipped) {
    alongX();
    alongY();
  } else {
    alongY();
    alongX();
  }
  return tiles;
}
