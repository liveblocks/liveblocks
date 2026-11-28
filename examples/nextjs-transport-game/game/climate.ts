import type { IndustryType } from "./world";

// What kind of country a map is. It decides how wet and how wooded the land
// is, which industries there are, and what everything looks like.
export type Climate = "normal" | "snow" | "desert" | "jungle";

// The shape of the land: reaching to the edges of the map, or an island
// with water all around it
export type Landscape = "mainland" | "island";

export type MapOptions = { climate: Climate; landscape: Landscape };

export const DEFAULT_MAP: MapOptions = {
  climate: "normal",
  landscape: "mainland",
};

export const CLIMATES: Record<
  Climate,
  {
    label: string;
    detail: string;
    // How much of the map is water
    water: number;
    // Woods grow where a map of random values, from 0 to 1, is above
    // `woodland`. A share of the other tiles has a tree on its own.
    woodland: number;
    strayTrees: number;
    // Every industry that takes cargo in, and the ones that produce it. A
    // kind that is listed twice is on the map twice as often.
    consumers: IndustryType[];
    producers: IndustryType[];
  }
> = {
  normal: {
    label: "Normal",
    detail: "Green fields and woods. Coal, wood, grain and oil.",
    water: 0.2,
    woodland: 0.62,
    strayTrees: 0.04,
    consumers: ["power_station", "sawmill", "factory", "refinery"],
    producers: [
      "coal_mine",
      "coal_mine",
      "forest",
      "forest",
      "farm",
      "farm",
      "oil_wells",
    ],
  },
  // Each of the other climates has industries of its own, next to one or
  // two that are found elsewhere too
  snow: {
    label: "Snow",
    detail: "Pine forests under snow. Coal, gold, fish and ice.",
    water: 0.2,
    woodland: 0.56,
    strayTrees: 0.05,
    consumers: ["power_station", "bank", "cannery", "ice_hotel"],
    producers: [
      "coal_mine",
      "coal_mine",
      "gold_mine",
      "gold_mine",
      "fishing_camp",
      "fishing_camp",
      "ice_quarry",
    ],
  },
  desert: {
    label: "Desert",
    detail: "Dry and bare, with little water. Oil, copper ore, sand and water.",
    water: 0.07,
    woodland: 0.84,
    strayTrees: 0.02,
    consumers: ["refinery", "smelter", "glassworks", "water_tower"],
    producers: [
      "oil_wells",
      "oil_wells",
      "copper_mine",
      "copper_mine",
      "sand_pit",
      "sand_pit",
      "water_supply",
    ],
  },
  jungle: {
    label: "Jungle",
    detail: "Rainforest, rivers and lakes. Rubber, cocoa, fruit and emeralds.",
    water: 0.26,
    woodland: 0.42,
    strayTrees: 0.14,
    consumers: ["tyre_factory", "chocolate_factory", "food_plant", "jeweller"],
    producers: [
      "rubber_plantation",
      "rubber_plantation",
      "cocoa_farm",
      "cocoa_farm",
      "plantation",
      "plantation",
      "gem_mine",
    ],
  },
};

export const CLIMATE_KINDS: readonly Climate[] = [
  "normal",
  "snow",
  "desert",
  "jungle",
];

export const LANDSCAPES: Record<Landscape, { label: string; detail: string }> =
  {
    mainland: {
      label: "Mainland",
      detail: "Land up to the edges of the map, with lakes and rivers",
    },
    island: {
      label: "Island",
      detail: "One piece of land with water all around it",
    },
  };

export const LANDSCAPE_KINDS: readonly Landscape[] = ["mainland", "island"];

// What is in Storage can come from a room that is older than map types
export function mapOptions(stored: {
  climate?: string;
  landscape?: string;
}): MapOptions {
  return {
    climate:
      CLIMATE_KINDS.find((climate) => climate === stored.climate) ??
      DEFAULT_MAP.climate,
    landscape:
      LANDSCAPE_KINDS.find((landscape) => landscape === stored.landscape) ??
      DEFAULT_MAP.landscape,
  };
}
