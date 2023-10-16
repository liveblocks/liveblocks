import { createClient, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  focusedId: string | null;
};

type Theme = "light" | "dark";

type Logo = {
  name: string;
  theme: Theme;
};

// Storage represents the shared document that persists in the Room, even after
// all Users leave. Fields under Storage typically are LiveList, LiveMap,
// LiveObject instances, for which updates are automatically persisted and
// synced to all connected clients.
type Storage = {
  logo: LiveObject<Logo>;
};

// UserMeta represents static/readonly metadata on each User, as provided by
// your own custom auth backend (if used). Useful for data that will not change
// during a session, like a User's name or avatar.
type UserMeta = {
  id: string; // Accessible through `user.id`

  // Accessible through `user.info`
  info: {
    name: string;
    avatar: string;
  };
};

// Optionally, the type of custom events broadcasted and listened for in this
// room. Must be JSON-serializable.
// type RoomEvent = {};

export const {
  RoomProvider,
  useMutation,
  useOthers,
  useOthersMapped,
  useSelf,
  useStorage,
  useUpdateMyPresence,
} = createRoomContext<Presence, Storage, UserMeta /* RoomEvent */>(client);
