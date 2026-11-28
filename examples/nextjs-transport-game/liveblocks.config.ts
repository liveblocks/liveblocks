import type { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  CompanyData,
  IndustryState,
  StationData,
  StatsSample,
  Tool,
  TownGrowth,
  VehicleData,
} from "./game/types";

declare global {
  interface Liveblocks {
    // Custom user info set when authenticating with a secret key
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };

    // Where each player is pointing on the map (in tile coordinates), the
    // tool they are holding, and the company they chose to run. A company
    // counts as taken for as long as a connected player has it here.
    Presence: {
      cursor: { x: number; y: number } | null;
      tool: Tool;
      company: string | null;
    };

    // Everything players build. The terrain, towns and industries are not
    // stored: every client generates them from `seed`.
    Storage: {
      seed: number;
      // How many tiles the map has on each side
      size: number;
      // When this map was started, on the game clock. Industries have been
      // producing since then.
      startedAt: number;
      // The game clock stands still while the game is paused: see
      // `game/clock.ts`. Pausing only writes these two.
      pausedAt: number | null;
      pausedFor: number;
      // Town id → how far the town had grown when the number of its stations
      // that vehicles call at last changed, which changes how fast it grows
      // from then on. Nobody writes a town's new buildings here: every client
      // works out how far each town has grown from the clock.
      towns: LiveMap<string, TownGrowth>;
      // Tile → id of the company that built on it
      roads: LiveMap<string, string>;
      rails: LiveMap<string, string>;
      canals: LiveMap<string, string>;
      // Industry id → what it has waiting, and how much it makes
      industries: LiveMap<string, IndustryState>;
      // Tile → station
      stations: LiveMap<string, LiveObject<StationData>>;
      vehicles: LiveMap<string, LiveObject<VehicleData>>;
      // Company id → company. Companies appear here once someone picks them.
      companies: LiveMap<string, LiveObject<CompanyData>>;
      // How every company was doing over time, for the statistics window.
      // The key counts the periods since the map started.
      stats: LiveMap<string, StatsSample>;
      // Tiles where a building was demolished → id of the company that did.
      // Towns don't build there again.
      demolished: LiveMap<string, string>;
    };

    // News shown to everyone in the room, e.g. when a player buys a train
    RoomEvent: {
      type: "news";
      text: string;
      color: string;
    };
  }
}

export {};
