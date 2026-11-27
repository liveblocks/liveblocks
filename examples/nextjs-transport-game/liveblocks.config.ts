import type { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  CompanyData,
  StationData,
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
      // When this map was started. Towns have been growing since then, and
      // nobody writes their new buildings here: every client works out how
      // far each town has grown from the clock.
      startedAt: number;
      // Town id → how far the town had grown when a station was last built
      // or removed near it, which changes how fast it grows from then on
      towns: LiveMap<string, TownGrowth>;
      // Tile → id of the company that built on it
      roads: LiveMap<string, string>;
      rails: LiveMap<string, string>;
      // Tile → station
      stations: LiveMap<string, LiveObject<StationData>>;
      vehicles: LiveMap<string, LiveObject<VehicleData>>;
      // Company id → company. Companies appear here once someone picks them.
      companies: LiveMap<string, LiveObject<CompanyData>>;
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
