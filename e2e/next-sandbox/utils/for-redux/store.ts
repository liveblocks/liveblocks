import { liveblocksEnhancer, type WithLiveblocks } from "@liveblocks/redux";
import type { PayloadAction } from "@reduxjs/toolkit";
import { configureStore, createSlice } from "@reduxjs/toolkit";

import createLiveblocksClient from "../../utils/createClient";

export const client = createLiveblocksClient();

export type State = {
  // Presence
  name?: string;
  counter: number;

  // Storage
  items: string[];
};

const initialState: State = {
  // name: undefined,
  counter: 0,
  items: [],
};

const slice = createSlice({
  name: "state",
  initialState,
  reducers: {
    setName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    incCounter: (state) => {
      state.counter++;
    },
    addItem: (state, action: PayloadAction<string>) => {
      state.items.push(action.payload);
    },
    deleteItem: (state, action: PayloadAction<number>) => {
      state.items.splice(action.payload, 1);
    },
    clear: (state) => {
      state.items = [];
    },
  },
});

export const { setName, incCounter, addItem, deleteItem, clear } =
  slice.actions;

export function makeStore() {
  return configureStore({
    reducer: slice.reducer,
    enhancers: [
      liveblocksEnhancer<State>({
        client,
        storageMapping: { items: true },
        presenceMapping: { name: true, counter: true },
      }),
    ],
  });
}

const store = makeStore();

export type AppState = WithLiveblocks<
  ReturnType<typeof store.getState>,
  { items: string[] },
  never
>;

export type AppDispatch = typeof store.dispatch;

export default store;
