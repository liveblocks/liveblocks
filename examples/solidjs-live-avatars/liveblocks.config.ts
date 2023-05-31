import { createClient, type Room } from "@liveblocks/client";

export const PUBLIC_API_KEY = "your public key";

if (!/^pk_(live|test)/.test(PUBLIC_API_KEY)) {
  console.warn(
    `Replace "${PUBLIC_API_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/solidjs-live-avatars#getting-started.`
  );
}

export const client = createClient({
  publicApiKey: PUBLIC_API_KEY,
});

// let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

// export const client = createClient({
//   publicApiKey: PUBLIC_KEY,
// });

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
export type Presence = {
  picture: string;
  name: string;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  // author: LiveObject<{ firstName: string, lastName: string }>,
  // ...
};

// Optionally, UserMeta represents static/readonly metadata on each user, as
// provided by your own custom auth back end (if used). Useful for data that
// will not change during a session, like a user's name or avatar.
type UserMeta = {
  // id?: string,  // Accessible through `user.id`
  // info?: Json,  // Accessible through `user.info`
};

// Optionally, the type of custom events broadcast and listened to in this
// room. Use a union for multiple events. Must be JSON-serializable.
type RoomEvent = {
  // type: "NOTIFICATION",
  // ...
};

export type TypedRoom = Room<Presence, Storage, UserMeta, RoomEvent>;
