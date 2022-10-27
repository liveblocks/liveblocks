import create from "zustand";
import { createClient } from "@liveblocks/client";
import { liveblocks } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

overrideApiKey();

const client = createClient({
  publicApiKey: PUBLIC_KEY,
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

type Presence = {
  isTyping: boolean;
};

const useStore = create<WithLiveblocks<State, Presence>>()(
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

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideApiKey() {
  const query = new URLSearchParams(window?.location?.search);
  const apiKey = query.get("apiKey");

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }
}
