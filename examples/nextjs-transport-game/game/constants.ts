import type { Cargo, LineKind, SignalKind, Transport } from "./types";

// The maps a game can be played on. A map has as many tiles on each side as
// its size says, and a new game starts on the smallest one.
export const MAP_SIZES: readonly { size: number; label: string }[] = [
  { size: 64, label: "Small" },
  { size: 96, label: "Medium" },
  { size: 128, label: "Large" },
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
export const TOWN_GROWTH_PER_STATION = 1.6;
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
// When nobody moved the vehicles for a while, at most this much time is
// made up for in one go
export const CATCHUP_MS = 2000;

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
// What taking away a tile of a town's street costs
export const STREET_REMOVAL_COST = 250;
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
  gold: { label: "Gold", rate: 5.2, color: "#e8c547" },
  copper: { label: "Copper ore", rate: 2.8, color: "#b5673c" },
  water: { label: "Water", rate: 2.4, color: "#5aa7d8" },
  fruit: { label: "Fruit", rate: 3.2, color: "#e2703a" },
  fish: { label: "Fish", rate: 3.2, color: "#8fb4c9" },
  ice: { label: "Ice", rate: 2.4, color: "#bfe6f2" },
  sand: { label: "Sand", rate: 2.2, color: "#e0c98a" },
  rubber: { label: "Rubber", rate: 3.4, color: "#c9a36b" },
  cocoa: { label: "Cocoa", rate: 3.6, color: "#6b3f24" },
  gems: { label: "Emeralds", rate: 5.6, color: "#2fae77" },
};

export const CARGO_KINDS: readonly Cargo[] = [
  "passengers",
  "coal",
  "wood",
  "grain",
  "oil",
  "gold",
  "copper",
  "water",
  "fruit",
  "fish",
  "ice",
  "sand",
  "rubber",
  "cocoa",
  "gems",
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
    // Where vehicles are bought, and come out of
    depotLabel: string;
    depotCost: number;
  }
> = {
  road: {
    stationLabel: "Road stop",
    stationCost: 1500,
    vehicleLabel: "Road vehicle",
    depotLabel: "Garage",
    depotCost: 2000,
  },
  rail: {
    stationLabel: "Train station",
    stationCost: 3500,
    vehicleLabel: "Train",
    depotLabel: "Engine shed",
    depotCost: 4000,
  },
  // Slow, but they carry a lot and need nothing built between two docks
  water: {
    stationLabel: "Dock",
    stationCost: 3000,
    vehicleLabel: "Ship",
    depotLabel: "Shipyard",
    depotCost: 3500,
  },
};

// What can be bought at a depot. A train is an engine with carriages behind
// it: the engine sets the speed and how many it can pull, and every carriage
// adds to what the train costs, carries and costs to run.
export type Model = {
  id: string;
  kind: Transport;
  name: string;
  detail: string;
  cost: number;
  // What it carries: for a train, each of its carriages
  capacity: number;
  // Tiles per second
  speed: number;
  // Running cost per tile travelled
  runningCost: number;
  // For engines: how many carriages they pull at most
  maxCars?: number;
};

export const MODELS: readonly Model[] = [
  {
    id: "cub",
    kind: "road",
    name: "Cub",
    detail: "Small and cheap to run",
    cost: 5000,
    capacity: 14,
    speed: 1.8,
    runningCost: 3,
  },
  {
    id: "hauler",
    kind: "road",
    name: "Hauler",
    detail: "Carries a fair load at a fair speed",
    cost: 8000,
    capacity: 24,
    speed: 2.2,
    runningCost: 5,
  },
  {
    id: "titan",
    kind: "road",
    name: "Titan",
    detail: "Big and fast, for busy routes",
    cost: 15_000,
    capacity: 38,
    speed: 2.9,
    runningCost: 9,
  },
  {
    id: "kettle",
    kind: "rail",
    name: "Kettle",
    detail: "A steam engine for short trains",
    cost: 12_000,
    capacity: 30,
    speed: 2.4,
    runningCost: 8,
    maxCars: 4,
  },
  {
    id: "diesel",
    kind: "rail",
    name: "Workhorse",
    detail: "A diesel engine that pulls most things",
    cost: 20_000,
    capacity: 30,
    speed: 3.6,
    runningCost: 12,
    maxCars: 7,
  },
  {
    id: "arrow",
    kind: "rail",
    name: "Arrow",
    detail: "An electric engine for long, fast trains",
    cost: 38_000,
    capacity: 30,
    speed: 5,
    runningCost: 22,
    maxCars: 10,
  },
  {
    id: "barge",
    kind: "water",
    name: "Barge",
    detail: "Slow, but nothing carries more",
    cost: 13_000,
    capacity: 190,
    speed: 1.1,
    runningCost: 4,
  },
  {
    id: "freighter",
    kind: "water",
    name: "Freighter",
    detail: "A dependable ship for any cargo",
    cost: 20_000,
    capacity: 130,
    speed: 1.5,
    runningCost: 5,
  },
  {
    id: "clipper",
    kind: "water",
    name: "Clipper",
    detail: "Fast for a ship, with less room on board",
    cost: 30_000,
    capacity: 80,
    speed: 2.4,
    runningCost: 8,
  },
];

// What vehicles from before there was a choice count as
export const DEFAULT_MODEL: Record<Transport, string> = {
  road: "hauler",
  rail: "diesel",
  water: "freighter",
};
export const DEFAULT_CARS = 3;
// What each carriage adds to the price of a train, and to what it costs to
// run per tile
export const CAR_COST = 4000;
export const CAR_RUNNING_COST = 2;
// How far apart the engine and the carriages of a train are, in tiles
export const CAR_GAP = 0.42;
// How many carriages can load and unload for every tile of platform
export const CARS_PER_PLATFORM_TILE = 2;
// How long road vehicles and ships are, in tiles
export const VEHICLE_LENGTH: Record<Transport, number> = {
  road: 0.4,
  rail: CAR_GAP,
  water: 0.74,
};

// Signals stand beside a piece of railway and face one way. A train going
// that way stops at a signal until it lets the train through.
export const SIGNALS: Record<
  SignalKind,
  { label: string; detail: string; cost: number }
> = {
  block: {
    label: "Block signal",
    detail:
      "Lets a train through when no other train is on the track behind it, up to the next signals",
    cost: 300,
  },
  path: {
    label: "Path signal",
    detail:
      "Lets a train through when its own way to the next signal is free, so trains can share a junction",
    cost: 450,
  },
  oneway: {
    label: "One-way path signal",
    detail:
      "A path signal that trains can't pass from behind: it makes a track one-way",
    cost: 500,
  },
};

// Vehicles are moved along in small steps of game time. Between steps
// everyone works out where they are from when they last set off.
export const STEP_MS = 100;
// How long before a vehicle gets to the end of what it may drive on it asks
// for more, so it doesn't have to slow down when the way ahead is free
export const LOOKAHEAD_MS = 1000;
// How many tiles further than that road vehicles and ships claim
export const CLAIM_AHEAD = 3;
// A vehicle that stood still sets off this long after it was told to, so
// everyone sees it start from where it stood
export const START_MS = 300;
// How long the wreck of a crashed train stays on the track
export const WRECK_MS = 12_000;

// Storage from before the game had depots, signals and carriages is brought
// up to date when a room is opened
export const STORAGE_VERSION = 2;
