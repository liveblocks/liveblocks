import { createClient } from "@liveblocks/client";
import { enhancer } from "@liveblocks/redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

overrideApiKey();

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/redux-todo-list#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const initialState = {
  todos: [],
  draft: "",
  isTyping: false,
};

const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    setDraft: (state, action) => {
      state.isTyping = action.payload === "" ? false : true;
      state.draft = action.payload;
    },
    addTodo: (state) => {
      state.isTyping = false;
      state.todos.push({ text: state.draft });
      state.draft = "";
    },
    deleteTodo: (state, action) => {
      state.todos.splice(action.payload, 1);
    },
  },
});

export const { addTodo, deleteTodo, setDraft } = slice.actions;

export function makeStore() {
  return configureStore({
    reducer: slice.reducer,
    enhancers: [
      enhancer({
        client,
        storageMapping: { todos: true },
        presenceMapping: { isTyping: true },
      }),
    ],
  });
}

const store = makeStore();

export default store;

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
