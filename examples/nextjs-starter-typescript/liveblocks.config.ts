import { createClient, LiveMap, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Creating client with a custom callback that calls our API
// In this API we'll assign each user custom data, such as names, avatars
// If any client side data is needed to get user info from your system,
// (e.g. auth token, user id) send it in the body alongside `room`.
// Check inside `/pages/api/ath` for the endpoint
const client = createClient({
  authEndpoint: async (room) => {
    const body = {
      // Simulate passing the current user's id
      userId: Math.floor(Math.random() * 7),
      room,
    };

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        Authentication: "token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await response.json();
  },
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
export type Presence = {
  cursor: { x: number, y: number } | null;
};

export type Shape = LiveObject<{
  x: number;
  y: number;
  text: string;
  selectedBy: UserMeta["info"] | null;
  id: string;
}>;

export type Shapes = LiveMap<string, Shape>;

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
  shapes: Shapes;
};

export type UserInfo = {
  name: string;
  color: string;
  picture?: string;
}

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a User's name or avatar.
export type UserMeta = {
  info: UserInfo
};

// Optionally, the type of custom events broadcasted and listened for in this
// room. Must be JSON-serializable.
// type RoomEvent = {};

export const {
  RoomProvider,
  useUpdateMyPresence,
  useSelf,
  useOthers,
  useBatch,
  useHistory,
  useMap,
  useRoom,
  /* ...all the other hooks you’re using... */
} = createRoomContext<Presence, Storage, UserMeta /*, RoomEvent */>(client);
