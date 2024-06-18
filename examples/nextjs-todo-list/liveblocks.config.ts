import type { LiveList, LiveObject } from "@liveblocks/client";

type Todo = {
  text: string;
  checked?: boolean;
};

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      isTyping: boolean;
    };
    // The Storage tree for the room, for useMutation, useStorage, etc.
    Storage: {
      todos: LiveList<LiveObject<Todo>>;
    };
  }
}
