import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  throw new Error(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-todo-list#getting-started.`
  );
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
