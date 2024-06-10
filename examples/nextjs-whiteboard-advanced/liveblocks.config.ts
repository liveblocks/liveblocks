import { createClient } from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { Point, Color, Layer } from "./src/types";

const client = createClient({
  throttle: 16,
  authEndpoint: "/api/liveblocks-auth",
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  selection: string[];
  cursor: Point | null;
  pencilDraft: [x: number, y: number, pressure: number][] | null;
  penColor: Color | null;
};

// Storage represents the shared document that persists in the Room, even after
// all Users leave. Fields under Storage typically are LiveList, LiveMap,
// LiveObject instances, for which updates are automatically persisted and
// synced to all connected clients.
type Storage = {
  layers: LiveMap<string, LiveObject<Layer>>;
  layerIds: LiveList<string>;
};

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
  }
}
