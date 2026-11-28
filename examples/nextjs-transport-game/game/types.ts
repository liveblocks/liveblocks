// What is laid on the ground for vehicles to run on
export type TrackKind = "road" | "rail";

// Everything that is built by dragging a line across the map. A canal is
// water that players dig, for ships to sail on.
export type LineKind = TrackKind | "canal";

// The ways of moving things around. Ships need no track: they sail on any
// water, canals included, from dock to dock.
export type Transport = TrackKind | "water";

export type Cargo =
  | "passengers"
  | "coal"
  | "wood"
  | "grain"
  | "oil"
  | "gold"
  | "copper"
  | "water"
  | "fruit";

export type Tool =
  | "select"
  | "road"
  | "rail"
  | "canal"
  | "road-station"
  | "rail-station"
  | "water-station"
  | "vehicle"
  | "bulldoze";

// Cargo waiting at a station. Amounts are evaluated lazily: `amount` is what
// was waiting at time `at`, and it keeps growing at the station's supply rate.
export type Stock = { [cargo in Cargo]?: { amount: number; at: number } };

// What an industry has made, and what became of it. Industries aren't in
// Storage until a vehicle loads or unloads at one.
export type IndustryState = {
  // What it makes piles up at the industry itself, for every station in
  // reach to load from. Like a station's stock, `stock` is what was waiting
  // at time `at`, and it has been growing since.
  stock: number;
  at: number;
  // Each level doubles how much it makes
  level: number;
  // How much has been carried away since `since`. Enough of it, for long
  // enough, takes the industry up a level.
  moved: number;
  since: number;
  // How much of what it accepts has been delivered to it so far
  received: number;
};

// How many units of each kind of cargo a vehicle is carrying
export type Load = { [cargo in Cargo]?: number };

// `owner` is always the id of a company, not of a player
export type StationData = {
  owner: string;
  kind: Transport;
  name: string;
  builtAt: number;
  stock: Stock;
};

export type VehicleData = {
  owner: string;
  kind: Transport;
  // Tile keys of the stations this vehicle shuttles between
  stops: string[];
  // Index of the current leg: the vehicle travels from `stops[leg % n]` to
  // `stops[(leg + 1) % n]`
  leg: number;
  // Tiles of the current leg. Empty while the vehicle is waiting for a route.
  path: number[];
  // When the vehicle leaves (or left) the station at the start of `path`.
  // Everyone derives the vehicle's position from this timestamp.
  departAt: number;
  // What is on board for this leg: a vehicle takes along every kind of
  // cargo that its next station accepts
  load: Load;
  // Lifetime profit and stats
  earned: number;
  lastIncome: number;
  trips: number;
};

// A vehicle as read from Storage (`useStorage` and `toJSON()` return
// read-only snapshots). The game logic only ever needs this read-only view.
export type Vehicle = Omit<VehicleData, "stops" | "path"> & {
  readonly stops: readonly string[];
  readonly path: readonly number[];
};

export type CompanyData = {
  name: string;
  color: string;
  // Money is never stored as a single number that several clients overwrite.
  // Instead: balance = START_MONEY + banked + sum(vehicle.earned) - spent
  spent: number;
  banked: number;
  foundedAt: number;
};

// How far a town had grown at a given time, and how many of its stations
// vehicles were calling at then, which sets how fast it has been growing
// since. Like cargo at a station, growth isn't updated on a timer: it is
// worked out from this and from the clock.
export type TownGrowth = { steps: number; at: number; stations: number };

// How the game stood at one moment, for the graphs in the statistics window
export type StatsSample = {
  // Company id → its money, what its vehicles have earned so far, and how
  // many vehicles it has
  companies: {
    [company: string]: { balance: number; earned: number; vehicles: number };
  };
  // How many people live in all the towns together
  population: number;
  // How much freight has been delivered to industries so far
  freight: number;
};

export type ActionResult =
  | { ok: true; cost: number; message?: string }
  | { ok: false; message: string };
