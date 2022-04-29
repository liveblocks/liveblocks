import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const query = new URLSearchParams(window?.location?.search);

/**
 * Replace by your public key from https://liveblocks.io/dashboard/apikeys.
 */
let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

/**
 * Used for coordinating public API keys from outside (e.g. https://liveblocks.io/examples).
 *
 * http://localhost:3000/?token=pk_live_1234
 */
const token = query.get("token");

if (token) {
  PUBLIC_KEY = token;
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const useStore = create(
  middleware(
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
