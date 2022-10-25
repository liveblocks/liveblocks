import { GetState, SetState } from "zustand";
import { MyState } from "./useStore";

export type BearSlice = {
  eatFish: () => void;
};

const createBearSlice = (set: SetState<MyState>, get: GetState<MyState>) => ({
  eatFish: () => {
    set((prev) => ({ fishes: prev.fishes > 1 ? prev.fishes - 1 : 0 }));
  },
});

export default createBearSlice;
