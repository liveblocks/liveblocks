import { createClient, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  /* client options */
  authEndpoint: "/api/auth"
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type BasicPresence = {
  cursor: { x: number, y: number } | null;
}

type CanvasPresence = {
  cursor: { x: number, y: number } | null;
  selectedShape: string;
};

type Presence = BasicPresence | CanvasPresence;

export type Shape = {
  x: number;
  y: number;
  text: string;
  selectedBy: number | null;
  id: string;
};

export type Shapes = LiveMap<string, LiveObject<Shape>>;

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
  shapes: Shapes;
};

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a User's name or avatar.
type UserMeta = {
  info: {
    name: string;
    color: string;
    picture?: string;
  }
};

// Optionally, the type of custom events broadcasted and listened for in this
// room. Must be JSON-serializable.
// type RoomEvent = {};

const {
  RoomProvider,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useBatch,
  useHistory,
  useMap,
  useMyPresence,
  useRoom,
  /* ...all the other hooks you’re using... */
} = createRoomContext<Presence, Storage, UserMeta /*, RoomEvent */>(client);

export {
  RoomProvider,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useBatch,
  useHistory,
  useMap,
  useMyPresence,
  useRoom,
  /* ...all the other hooks you’re using... */
};
