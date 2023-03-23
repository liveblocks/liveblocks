import { createClient } from "@liveblocks/client";
import type { BaseUserMeta } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  throttle: 16,
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  cursor: {
    x: number;
    y: number;
  } | null;
  message: string;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // animals: LiveList<string>,
  // ...
};

// Optionally, UserMeta represents static/readonly metadata on each User, as
// provided by your own custom auth backend (if used). Useful for data that
// will not change during a session, like a User's name or avatar.
// type UserMeta = {
//   id?: string,  // Accessible through `user.id`
//   info?: Json,  // Accessible through `user.info`
// };
type UserMeta = BaseUserMeta;

// The type of custom events broadcasted and listened for in this
// room. Must be JSON-serializable.
type RoomEvent = {
  x: number;
  y: number;
  value: string;
};

export const {
  RoomProvider,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
