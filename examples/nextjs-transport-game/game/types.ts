// What is laid on the ground for vehicles to run on
export type TrackKind = "road" | "rail";

// The ways of moving things around. Ships need no track: they sail on any
// water, from dock to dock.
export type Transport = TrackKind | "water";

export type Cargo = "passengers" | "coal" | "wood" | "grain" | "oil";

export type Tool =
  | "select"
  | "road"
  | "rail"
  | "road-station"
  | "rail-station"
  | "water-station"
  | "vehicle"
  | "bulldoze";

// Cargo waiting at a station. Amounts are evaluated lazily: `amount` is what
// was waiting at time `at`, and it keeps growing at the station's supply rate.
export type Stock = { [cargo in Cargo]?: { amount: number; at: number } };

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
  cargo: Cargo | null;
  load: number;
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

// How far a town had grown at a given time, and how many stations it had
// around it then, which sets how fast it has been growing since. Like cargo
// at a station, growth isn't updated on a timer: it is worked out from this
// and from the clock.
export type TownGrowth = { steps: number; at: number; stations: number };

export type ActionResult =
  | { ok: true; cost: number; message?: string }
  | { ok: false; message: string };
