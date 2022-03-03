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
  todos: Todo[];
  isTyping: boolean;
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
}

const useStore = create(
  middleware<State>(
    (set) => ({
      draft: "",
      todos: [],
      isTyping: false,
      setDraft: (draft: string) =>
        set({
          draft,
          isTyping: draft === "" ? false : true,
        }),
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
    {
      client,
      storageMapping: { todos: true },
      presenceMapping: { isTyping: true },
    }
  )
);

export default useStore;
