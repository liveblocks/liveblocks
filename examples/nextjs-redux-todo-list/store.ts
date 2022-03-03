import { createClient } from "@liveblocks/client";
import { LiveblocksState, enhancer } from "@liveblocks/redux";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

export type State = {
  draft: string;
  todos: Todo[];
  isTyping: boolean;
};

type Todo = {
  text: string;
};

const initialState: State = {
  todos: [],
  draft: "",
  isTyping: false,
};

const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    setDraft: (state, action: PayloadAction<string>) => {
      state.isTyping = true;
      state.draft = action.payload;
    },
    addTodo: (state) => {
      state.isTyping = false;
      state.todos.push({ text: state.draft });
      state.draft = "";
    },
    deleteTodo: (state, action: PayloadAction<number>) => {
      state.todos.splice(action.payload);
    },
    onInputBlur: (state) => {
      state.isTyping = false;
    },
  },
});

export const { addTodo, deleteTodo, setDraft, onInputBlur } = slice.actions;

export function makeStore() {
  return configureStore({
    reducer: slice.reducer,
    enhancers: [
      enhancer<State>({
        client,
        storageMapping: { todos: true },
        presenceMapping: { isTyping: true },
      }),
    ],
  });
}

const store = makeStore();

export type AppState = LiveblocksState<
  ReturnType<typeof store.getState>,
  { isTyping: boolean }
>;

export type AppDispatch = typeof store.dispatch;

export default store;
