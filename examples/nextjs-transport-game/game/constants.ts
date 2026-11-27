import type { Cargo, TrackKind } from "./types";

export const MAP_SIZE = 64;
export const TILE_W = 64;
export const TILE_H = 32;

// Stations serve every house and industry within this many tiles
export const CATCHMENT = 3;

// The transport companies players choose from when they join. A company is
// run by one player at a time, and keeps everything it owns when that player
// leaves, ready for the next one to take over.
export const COMPANIES: readonly { id: string; name: string; color: string }[] = [
  { id: "redline", name: "Redline Haulage", color: "#DC3D43" },
  { id: "bluebird", name: "Bluebird Transit", color: "#3358D4" },
  { id: "sunray", name: "Sunray Freight", color: "#EBB000" },
  { id: "greenfield", name: "Greenfield Lines", color: "#2B9A4B" },
  { id: "violet", name: "Violet Valley Rail", color: "#8445BC" },
  { id: "copper", name: "Copper Kettle Cargo", color: "#A85B24" },
];

export const START_MONEY = 100_000;
// What the hidden money cheat adds to your balance
export const CHEAT_MONEY = 100_000;
export const HOUSE_DEMOLISH_COST = 600;

// Towns grow by a share of their starting population every minute, and
// faster for each station that serves them (up to a few stations)
export const TOWN_GROWTH_PER_MINUTE = 0.012;
export const TOWN_GROWTH_PER_STATION = 0.02;
export const TOWN_MAX_STATIONS = 4;
export const TOWN_MAX_GROWTH = 4;
export const MAX_VEHICLES_PER_COMPANY = 30;

// Time a vehicle spends at a station between two legs
export const LOAD_MS = 2500;
// How often a vehicle without a valid route looks for one again
export const RETRY_MS = 4000;
// When nobody was online to run a vehicle, at most this much time is replayed
export const CATCHUP_MS = 60_000;

export const STOCK_CAP = 240;
export const HOUSE_PASSENGER_RATE = 0.03;
export const MIN_HOUSES_FOR_PASSENGERS = 3;

export const BRIDGE_MULTIPLIER = 5;
export const TREE_CLEAR_COST = 40;

export const CARGO: Record<
  Cargo,
  {
    label: string;
    // Income per unit, per tile of distance between the two stations
    rate: number;
    color: string;
  }
> = {
  passengers: { label: "Passengers", rate: 2.2, color: "#f4f4f5" },
  coal: { label: "Coal", rate: 2.6, color: "#2f2f33" },
  wood: { label: "Wood", rate: 2.6, color: "#8a5a33" },
  grain: { label: "Grain", rate: 3, color: "#e2b93b" },
  oil: { label: "Oil", rate: 3.4, color: "#56606e" },
};

export const TRACK: Record<
  TrackKind,
  {
    label: string;
    // Cost per tile
    cost: number;
    stationLabel: string;
    stationCost: number;
    vehicleLabel: string;
    vehicleCost: number;
    capacity: number;
    // Tiles per second
    speed: number;
    // Running cost per tile travelled
    runningCost: number;
  }
> = {
  road: {
    label: "Road",
    cost: 100,
    stationLabel: "Road stop",
    stationCost: 1500,
    vehicleLabel: "Road vehicle",
    vehicleCost: 8000,
    capacity: 24,
    speed: 2.2,
    runningCost: 5,
  },
  rail: {
    label: "Railway",
    cost: 220,
    stationLabel: "Train station",
    stationCost: 3500,
    vehicleLabel: "Train",
    vehicleCost: 32_000,
    capacity: 90,
    speed: 3.6,
    runningCost: 18,
  },
};

// Trains pull wagons, which trail behind the locomotive along its path
export const TRAIN_WAGONS = 3;
export const TRAIN_WAGON_GAP = 0.42;
export const TRAIN_LENGTH = TRAIN_WAGONS * TRAIN_WAGON_GAP;
