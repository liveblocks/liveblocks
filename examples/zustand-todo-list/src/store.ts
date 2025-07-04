import { create } from "zustand";
import { createClient } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

declare global {
  interface Liveblocks {
    // Each user's Presence, for room.getPresence, room.subscribe("others"), etc.
    Presence: {
      isTyping: boolean;
    };
  }
}

const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
});

type Todo = {
  text: string;
};

type State = {
  draft: string;
  isTyping: boolean;
  todos: Todo[];
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
};

const useStore = create<WithLiveblocks<State>>()(
  liveblocks(
    (set) => ({
      draft: "",
      isTyping: false,
      todos: [],
      setDraft: (draft) =>
        set({ draft, isTyping: draft === "" ? false : true }),
      addTodo: () =>
        set((state) => ({
          todos: state.todos.concat({ text: state.draft }),
          draft: "",
        })),
      deleteTodo: (index) =>
        set((state) => ({
          todos: state.todos.filter((todo, i) => index !== i),
        })),
    }),
    {
      client,
      presenceMapping: { isTyping: true },
      storageMapping: { todos: true },
    }
  )
);
export default useStore;
