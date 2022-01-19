import create from "zustand";

import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type Todo = {
  text: string;
};

interface State {
  draft: string;
  setDraft: (draft: string) => void;
  todos: Todo[];
  addTodo: () => void;
  deleteTodo: (index: number) => void;
}

const useStore = create(
  middleware<State>(
    (set) => ({
      draft: "",
      todos: [],
      setDraft: (draft: string) => set({ draft }),
      addTodo: () =>
        set((state) => ({
          todos: state.todos.concat({ text: state.draft }),
          draft: "",
        })),
      deleteTodo: (index: number) =>
        set((state) => ({
          todos: state.todos.filter((todo, i) => index != i),
        })),
    }),
    { client, mapping: { todos: true } }
  )
);

export default useStore;
