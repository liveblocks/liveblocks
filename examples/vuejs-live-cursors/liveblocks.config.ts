import { createClient } from "@liveblocks/client";

export const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
  throttle: 16,
});

// Presence represents the properties that exist on every user in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  cursor: { x: number, y: number } | null,
  // ...
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

export type Room = ReturnType<typeof client.enter<Presence, Storage, UserMeta, RoomEvent>>;

// TODO consideration

// Needs string: true
// client.enter = client.enter<Presence, Storage, UserMeta, RoomEvent>


/*
// Export typed enter room function
export const enterRoom = (...args: Parameters<typeof client.enter<
  Presence,
  Storage,
  UserMeta,
  RoomEvent
>>) => {
  return client.enter<
    Presence,
    Storage,
    UserMeta,
    RoomEvent
  >(...args);
};

// Export leave room function
export const leaveRoom = (...args: Parameters<typeof client.leave>) =>
  client.leave(...args);

// Export Room type
export type Room = ReturnType<typeof enterRoom>;
 */


/*
// Needs strict: true

// Add types to client.enter
const enterRoomWithContext = client.enter<
  Presence,
  Storage,
  UserMeta,
  RoomEvent
>;

// Export typed enter room function
export const enterRoom = (...args: Parameters<typeof enterRoomWithContext>) => {
  return enterRoomWithContext(...args);
};

// Export leave room function
export const leaveRoom = (...args: Parameters<typeof client.leave>) =>
  client.leave(...args);

// Export Room type
export type Room = ReturnType<typeof enterRoom>;
 */
