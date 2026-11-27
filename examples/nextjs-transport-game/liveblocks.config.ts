import type { LiveMap, LiveObject } from "@liveblocks/client";
import type {
  CompanyData,
  StationData,
  Tool,
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
        // Also used as the color of the player's company
        color: string;
      };
    };

    // Where each player is pointing on the map (in tile coordinates), and the
    // tool they are holding
    Presence: {
      cursor: { x: number; y: number } | null;
      tool: Tool;
    };

    // Everything players build. The terrain, towns and industries are not
    // stored: every client generates them from `seed`.
    Storage: {
      seed: number;
      // Tile → id of the player who built on it
      roads: LiveMap<string, string>;
      rails: LiveMap<string, string>;
      // Tile → station
      stations: LiveMap<string, LiveObject<StationData>>;
      vehicles: LiveMap<string, LiveObject<VehicleData>>;
      // User id → company
      companies: LiveMap<string, LiveObject<CompanyData>>;
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
