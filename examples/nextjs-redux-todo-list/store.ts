import { createClient } from "@liveblocks/client";
import { plugin } from "@liveblocks/redux";
import { configureStore } from "@reduxjs/toolkit";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type Todo = {
  text: string;
};

function reducer(state: State = { todos: [] }, action: Action) {
  switch (action.type) {
    case "ADD_TODO":
      return { todos: state.todos.concat({ text: action.text }) };
    case "DELETE_TODO":
      return {
        todos: state.todos.filter((todo, i) => i !== action.index),
      };
    default:
      return state;
  }
}

export type State = {
  todos: Todo[];
};

type Action =
  | {
      type: "ADD_TODO";
      text: string;
    }
  | {
      type: "DELETE_TODO";
      index: number;
    };

export function makeStore() {
  return configureStore({
    reducer,
    enhancers: [plugin(client, {})],
  });
}

const store = makeStore();

export type AppState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export default store;
