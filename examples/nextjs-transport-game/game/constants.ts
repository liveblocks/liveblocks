import type { Cargo, LineKind, Transport } from "./types";

// The maps a game can be played on. A map has as many tiles on each side as
// its size says, and a new game starts on the smallest one.
export const MAP_SIZES: readonly {
  size: number;
  label: string;
  detail: string;
}[] = [
  { size: 64, label: "Small", detail: "7 towns" },
  { size: 96, label: "Medium", detail: "16 towns" },
  { size: 128, label: "Large", detail: "28 towns" },
];
export const DEFAULT_MAP_SIZE = 64;
export const TILE_W = 64;
export const TILE_H = 32;

// Stations serve every house and industry within this many tiles
export const CATCHMENT = 3;
// Docks sit out on the water, so they reach further
export const DOCK_CATCHMENT = 5;

// The transport companies players choose from when they join. A company is
// run by one player at a time, and keeps everything it owns when that player
// leaves, ready for the next one to take over.
export const COMPANIES: readonly { id: string; name: string; color: string }[] =
  [
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

// The buildings towns are made of. The first few are where people live and
// work, from smallest to tallest: as a town grows, they are replaced by the
// next one up. The others are places people go to, which stay as they are.
export const BUILDINGS: readonly {
  label: string;
  // How many people live or work in it, give or take a few
  residents: number;
  // For the places nobody lives in: how many people come and go
  visitors?: number;
  demolishCost: number;
  // How many tiles it covers on each side, if more than one
  size?: number;
}[] = [
  { label: "Cottage", residents: 14, demolishCost: 600 },
  { label: "Townhouse", residents: 38, demolishCost: 900 },
  { label: "Office block", residents: 110, demolishCost: 2500 },
  { label: "Tower", residents: 340, demolishCost: 8000 },
  { label: "Skyscraper", residents: 950, demolishCost: 25_000 },
  { label: "Shops", residents: 0, visitors: 120, demolishCost: 2000 },
  { label: "Church", residents: 0, visitors: 60, demolishCost: 5000 },
  { label: "Park", residents: 0, visitors: 40, demolishCost: 1000 },
  {
    label: "Stadium",
    residents: 0,
    visitors: 800,
    demolishCost: 30_000,
    size: 2,
  },
];
// How many of them people live and work in
export const BUILDING_TIERS = 5;
// Where the others are in `BUILDINGS`
export const SHOPS = 5;
export const CHURCH = 6;
export const PARK = 7;
export const STADIUM = 8;

// Towns grow one step at a time: a new house, another piece of street, or a
// bigger building. They only grow when something is transported to or from
// them: this is how many steps a small town takes per minute for each of its
// stations that vehicles call at (up to a few stations). Towns slow down a
// lot as they get close to their full size.
export const TOWN_GROWTH_PER_STATION = 8;
export const TOWN_MAX_STATIONS = 4;
// How far from its center a town can grow, in every direction, and how
// close a station has to be to make it grow
export const TOWN_RADIUS = 12;
export const MAX_VEHICLES_PER_COMPANY = 30;

// How every company is doing is written down this often, for the graphs in
// the statistics window, and kept for this many times: an hour of play
export const STATS_PERIOD_MS = 15_000;
export const STATS_SAMPLES = 240;

// Time a vehicle spends at a station between two legs
export const LOAD_MS = 2500;
// How often a vehicle without a valid route looks for one again
export const RETRY_MS = 4000;
// When nobody was online to run a vehicle, at most this much time is replayed
export const CATCHUP_MS = 60_000;

// How much cargo can pile up, at a station or at an industry that makes it
export const STOCK_CAP = 240;
// Passengers per second that show up at a station, for every person who
// lives, works or spends time within its reach
export const PASSENGERS_PER_PERSON = 0.0012;
export const MIN_HOUSES_FOR_PASSENGERS = 3;

// An industry only makes so much. When at least this share of what it makes
// is carried away, for at least this long, it starts making twice as much,
// a few times over.
export const INDUSTRY_SHARE = 0.6;
export const INDUSTRY_PERIOD_MS = 120_000;
export const INDUSTRY_MAX_LEVEL = 3;

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

export const CARGO_KINDS: readonly Cargo[] = [
  "passengers",
  "coal",
  "wood",
  "grain",
  "oil",
];

// Cost per tile
export const TRACK: Record<LineKind, { label: string; cost: number }> = {
  road: { label: "Road", cost: 100 },
  rail: { label: "Railway", cost: 220 },
  canal: { label: "Canal", cost: 400 },
};

export const TRANSPORT: Record<
  Transport,
  {
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
    stationLabel: "Road stop",
    stationCost: 1500,
    vehicleLabel: "Road vehicle",
    vehicleCost: 8000,
    capacity: 24,
    speed: 2.2,
    runningCost: 5,
  },
  rail: {
    stationLabel: "Train station",
    stationCost: 3500,
    vehicleLabel: "Train",
    vehicleCost: 32_000,
    capacity: 90,
    speed: 3.6,
    runningCost: 18,
  },
  // Slow, but they carry a lot and need nothing built between two docks
  water: {
    stationLabel: "Dock",
    stationCost: 3000,
    vehicleLabel: "Ship",
    vehicleCost: 20_000,
    capacity: 130,
    speed: 1.5,
    runningCost: 5,
  },
};

// Trains pull wagons, which trail behind the locomotive along its path
export const TRAIN_WAGONS = 3;
export const TRAIN_WAGON_GAP = 0.42;
export const TRAIN_LENGTH = TRAIN_WAGONS * TRAIN_WAGON_GAP;
