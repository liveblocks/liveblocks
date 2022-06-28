import { LiveblocksState, enhancer } from "@liveblocks/redux";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import createLiveblocksClient from "../../utils/createClient";

export const client = createLiveblocksClient();

export type State = {
  items: string[];
};

const initialState: State = {
  items: [],
};

const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push(action.payload);
    },
    deleteItem: (state, action: PayloadAction<number>) => {
      state.items.splice(action.payload);
    },
    clear: (state) => {
      state.items = [];
    },
  },
});

export const { addItem, deleteItem, clear } = slice.actions;

export function makeStore() {
  return configureStore({
    reducer: slice.reducer,
    enhancers: [
      enhancer<State>({
        client,
        storageMapping: { items: true },
      }),
    ],
  });
}

const store = makeStore();

export type AppState = LiveblocksState<
  ReturnType<typeof store.getState>,
  { items: string[] },
  never
>;

export type AppDispatch = typeof store.dispatch;

export default store;
