import { GetState, SetState } from "zustand";
import { MyState } from "./useStore";

export type FishSlice = {
  fishes: number;
  repopulate: () => void;
};

const maxFishes = 10;

const createFishSlice = (set: SetState<MyState>, get: GetState<MyState>) => ({
  fishes: maxFishes,
  repopulate: () => {
    set((prev) => ({ fishes: maxFishes }));
  },
});

export default createFishSlice;
