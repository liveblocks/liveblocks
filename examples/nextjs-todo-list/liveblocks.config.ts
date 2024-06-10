import type { LiveList, LiveObject } from "@liveblocks/client";

// Presence represents the properties that will exist on every User in the Room
// and that will automatically be kept in sync. Accessible through the
// `user.presence` property. Must be JSON-serializable.
type Presence = {
  isTyping: boolean;
};

// Optionally, Storage represents the shared document that persists in the
// Room, even after all Users leave. Fields under Storage typically are
// LiveList, LiveMap, LiveObject instances, for which updates are
// automatically persisted and synced to all connected clients.
type Storage = {
  todos: LiveList<LiveObject<Todo>>;
};

type Todo = {
  text: string;
  checked?: boolean;
};

declare global {
  interface Liveblocks {
    Presence: Presence;
    Storage: Storage;
  }
}
