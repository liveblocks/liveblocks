import { createClient } from "@liveblocks/client";
import { enhancer } from "@liveblocks/redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

// Replace this key with your public key provided at https://liveblocks.io/dashboard/apikeys
const PUBLIC_KEY = "pk_xxxxxxx";

if (PUBLIC_KEY.startsWith("pk_xxxxxxx")) {
  throw new Error(
    "Replace the above constant PUBLIC_KEY with your own Liveblocks public key."
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
