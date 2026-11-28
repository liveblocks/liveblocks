import { CARS_PER_PLATFORM_TILE } from "./constants";
import { neighbor, type Network, opposite, SIDES } from "./network";
import type { StationData } from "./types";

// Station tiles that touch each other are one station, if they are of the
// same kind and the same company: that is how stations are made bigger.
// Storage keeps one entry per tile. The oldest tile of a station is where
// its name and its waiting passengers are kept.
export type Station = StationData & {
  // The key of its oldest tile, which is what the station goes by
  id: string;
  tile: number;
  tiles: readonly number[];
};

export type Stations = {
  all: readonly Station[];
  // The station that a tile is part of
  at: (tile: number | string) => Station | undefined;
};

const cache = new WeakMap<object, Stations>();

export function groupStations(
  stations: ReadonlyMap<string, StationData>,
  size: number
): Stations {
  const cached = cache.get(stations);
  if (cached) {
    return cached;
  }

  const byTile = new Map<number, Station>();
  const all: Station[] = [];
  for (const [key, first] of stations) {
    if (byTile.has(Number(key))) {
      continue;
    }
    const tiles = [Number(key)];
    const seen = new Set(tiles);
    for (let index = 0; index < tiles.length; index++) {
      for (const side of SIDES) {
        const other = neighbor(size, tiles[index], side);
        const data = other >= 0 ? stations.get(String(other)) : undefined;
        if (
          data &&
          !seen.has(other) &&
          data.owner === first.owner &&
          data.kind === first.kind
        ) {
          seen.add(other);
          tiles.push(other);
        }
      }
    }
    tiles.sort((a, b) => a - b);
    let oldest = tiles[0];
    for (const tile of tiles) {
      if (
        stations.get(String(tile))!.builtAt <
        stations.get(String(oldest))!.builtAt
      ) {
        oldest = tile;
      }
    }
    const station: Station = {
      ...stations.get(String(oldest))!,
      id: String(oldest),
      tile: oldest,
      tiles,
    };
    all.push(station);
    for (const tile of tiles) {
      byTile.set(tile, station);
    }
  }

  const grouped: Stations = {
    all,
    at: (tile) => byTile.get(Number(tile)),
  };
  cache.set(stations, grouped);
  return grouped;
}

// How many tiles of platform a train has beside it when it stands with its
// engine on `tile`, having arrived heading for `heading`: the tiles of the
// station that its track runs back through
export function platformLength(
  network: Network,
  station: Pick<Station, "tiles">,
  tile: number,
  heading: number
) {
  const back = opposite(heading);
  let length = 0;
  let at = tile;
  while (at >= 0 && station.tiles.includes(at)) {
    length++;
    at = network.links[at] & back ? neighbor(network.size, at, back) : -1;
  }
  return length;
}

// How many of a train's carriages can load and unload at a platform
export function carriagesAt(platform: number) {
  return platform * CARS_PER_PLATFORM_TILE;
}

// Whether a train that arrives at `tile` heading for `heading` has reached
// the far end of a platform of this station
export function isPlatformEnd(
  network: Network,
  station: Pick<Station, "tiles">,
  tile: number,
  heading: number
) {
  if (!station.tiles.includes(tile)) {
    return false;
  }
  const next =
    network.links[tile] & heading ? neighbor(network.size, tile, heading) : -1;
  return next < 0 || !station.tiles.includes(next);
}
