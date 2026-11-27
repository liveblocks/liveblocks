import type { Transport } from "./types";
import { WATER, type World } from "./world";

// Which tiles have a road or a railway on them, including the streets that
// towns start with, and which tiles ships can sail on. Rebuilt from Storage
// whenever someone builds something.
export type Network = {
  size: number;
  road: Uint8Array;
  rail: Uint8Array;
  water: Uint8Array;
};

export const NORTH = 1;
export const EAST = 2;
export const SOUTH = 4;
export const WEST = 8;

export function buildNetwork(
  world: World,
  roads: Iterable<string>,
  rails: Iterable<string>
): Network {
  const road = Uint8Array.from(world.townRoads);
  const rail = new Uint8Array(world.size * world.size);
  for (const key of roads) {
    road[Number(key)] = 1;
  }
  for (const key of rails) {
    rail[Number(key)] = 1;
  }
  const water = world.terrain.map((terrain) => (terrain === WATER ? 1 : 0));
  return { size: world.size, road, rail, water };
}

export function gridOf(network: Network, kind: Transport) {
  return network[kind];
}

// Bitmask of the neighbors a track tile connects to. Tracks connect to every
// adjacent tile of the same kind.
export function connectionsAt(grid: Uint8Array, size: number, tile: number) {
  const x = tile % size;
  const y = Math.floor(tile / size);
  let mask = 0;
  if (y > 0 && grid[tile - size]) {
    mask |= NORTH;
  }
  if (x < size - 1 && grid[tile + 1]) {
    mask |= EAST;
  }
  if (y < size - 1 && grid[tile + size]) {
    mask |= SOUTH;
  }
  if (x > 0 && grid[tile - 1]) {
    mask |= WEST;
  }
  return mask;
}

// Shortest path between two tiles, as a list of tiles including both ends.
// Among equally short paths, it prefers the one with the fewest turns.
export function findPath(
  grid: Uint8Array,
  size: number,
  from: number,
  to: number
): number[] | null {
  if (!grid[from] || !grid[to]) {
    return null;
  }
  if (from === to) {
    return [from];
  }

  // Breadth-first search outward from the destination
  const distance = new Int32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  let head = 0;
  let tail = 0;
  distance[to] = 0;
  queue[tail++] = to;

  while (head < tail && distance[from] === -1) {
    const tile = queue[head++];
    const x = tile % size;
    const next = distance[tile] + 1;
    const neighbors = [
      tile >= size ? tile - size : -1,
      x < size - 1 ? tile + 1 : -1,
      tile + size < size * size ? tile + size : -1,
      x > 0 ? tile - 1 : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && grid[neighbor] && distance[neighbor] === -1) {
        distance[neighbor] = next;
        queue[tail++] = neighbor;
      }
    }
  }

  if (distance[from] === -1) {
    return null;
  }

  // Walk downhill toward the destination, going straight whenever possible
  const path = [from];
  let tile = from;
  let direction = 0;
  while (tile !== to) {
    const x = tile % size;
    const steps = [
      tile >= size ? -size : 0,
      x < size - 1 ? 1 : 0,
      tile + size < size * size ? size : 0,
      x > 0 ? -1 : 0,
    ];
    let chosen = 0;
    for (const step of steps) {
      if (step !== 0 && distance[tile + step] === distance[tile] - 1) {
        if (step === direction) {
          chosen = step;
          break;
        }
        if (chosen === 0) {
          chosen = step;
        }
      }
    }
    tile += chosen;
    direction = chosen;
    path.push(tile);
  }
  return path;
}

// The tiles of an L-shaped line between two tiles, used when dragging to
// build. The longer side of the L comes first.
export function lineBetween(size: number, from: number, to: number) {
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

  if (Math.abs(toX - x) >= Math.abs(toY - y)) {
    alongX();
    alongY();
  } else {
    alongY();
    alongX();
  }
  return tiles;
}
