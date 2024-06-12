import { LiveMap, LiveObject } from "@liveblocks/client";

type Shape = LiveObject<{
  x: number;
  y: number;
  fill: string;
}>;

declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      selectedShape: string | null;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      shapes: LiveMap<string, Shape>;
    };
  }
}
