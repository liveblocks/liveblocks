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
  | "fruit"
  | "fish"
  | "ice"
  | "sand"
  | "rubber"
  | "cocoa"
  | "gems";

// The three kinds of railway signal: see `SIGNALS` in `constants.ts`
export type SignalKind = "block" | "path" | "oneway";

export type Tool =
  | "select"
  | "road"
  | "rail"
  | "canal"
  | "road-station"
  | "rail-station"
  | "water-station"
  | "road-depot"
  | "rail-depot"
  | "water-depot"
  | "signal-block"
  | "signal-path"
  | "signal-oneway"
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

// A signal beside a piece of railway. `side` is the side of its tile that
// trains leave by when they pass it: one of the direction bits in
// `network.ts`. A block signal can face both ways, with a light on each side
// of the track: then `side` has the bits of both sides.
export type SignalData = {
  owner: string;
  kind: SignalKind;
  side: number;
};

// Where a company buys its vehicles. They come out on the side of its tile
// that `side` says, onto the road, railway or water next to it.
export type DepotData = {
  owner: string;
  kind: Transport;
  side: number;
  builtAt: number;
};

// What a vehicle is doing:
// - "run": it is on its way, or standing still at the end of what it may
//   drive on, waiting for the way ahead to clear
// - "dock": it is at the end of its path, at a station. It loads until
//   `departAt`, and sets off again as soon as it can after that.
// - "lost": there is no way to its next station. It looks again at
//   `departAt`.
// - "wreck": it crashed at `departAt`, and is cleared away a while later
export type VehicleStatus = "run" | "dock" | "lost" | "wreck";

export type VehicleData = {
  owner: string;
  kind: Transport;
  // What was bought: the id of one of the `MODELS`
  model: string;
  // How many carriages a train pulls. Other vehicles have none.
  cars: number;
  // Tile keys of the stations this vehicle shuttles between: any tile of
  // each station
  stops: string[];
  // Index of the current leg: the vehicle travels from `stops[leg % n]` to
  // `stops[(leg + 1) % n]`. A new vehicle is on leg -1, from its depot to
  // its first station.
  leg: number;
  // The tiles the vehicle is following, one after the other. The first one
  // is its depot while it is on leg -1.
  path: number[];
  status: VehicleStatus;
  // Everyone derives the vehicle's position from these three: it was `from`
  // tiles along `path` at `departAt`, and has been moving since, as far as
  // `limit`. The tiles from where it is up to `limit` are its own: no other
  // vehicle may be given them, which is what keeps vehicles apart.
  from: number;
  departAt: number;
  limit: number;
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
  // What its vehicles that were lost in crashes had earned. Only whoever
  // moves the vehicles writes this.
  scrapped?: number;
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
