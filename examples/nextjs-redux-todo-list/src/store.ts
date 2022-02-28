import { createClient } from "@liveblocks/client";
import { LiveblocksState, enhancer } from "@liveblocks/redux";
import { configureStore, Store } from "@reduxjs/toolkit";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type Todo = {
  text: string;
};

export type State = {
  draft: string;
  todos: Todo[];
};

function reducer(state: State = { todos: [], draft: "" }, action: Action) {
  switch (action.type) {
    case "SET_DRAFT":
      return { ...state, draft: action.draft };
    case "ADD_TODO":
      return { todos: state.todos.concat({ text: state.draft }), draft: "" };
    case "DELETE_TODO":
      return {
        ...state,
        todos: state.todos.filter((todo, i) => i !== action.index),
      };
    default:
      return state;
  }
}

type Action =
  | {
      type: "ADD_TODO";
    }
  | {
      type: "DELETE_TODO";
      index: number;
    }
  | {
      type: "SET_DRAFT";
      draft: string;
    };

export function makeStore() {
  return configureStore({
    reducer,
    enhancers: [enhancer({ client, storageMapping: { todos: true } })],
    preloadedState: { todos: [] },
  });
}

const store = makeStore();

export type AppState = LiveblocksState<ReturnType<typeof store.getState>>;

export type AppDispatch = typeof store.dispatch;

export default store;
