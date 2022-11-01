import type { StateCreator } from "zustand";
import create from "zustand";
import { createClient } from "@liveblocks/client";
import { liveblocks as liveblocksMiddleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

import { expectType, expectAssignable } from "tsd";

type BearSlice = {
  bears: number;
  addBear: () => void;
  eatFish: () => void;
};

type FishSlice = {
  fishes: number;
  addFish: () => void;
};

const createBearSlice: StateCreator<
  BearSlice & FishSlice,
  [],
  [],
  BearSlice
> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  eatFish: () => {
    set((state) => ({ fishes: state.fishes >= 1 ? state.fishes - 1 : 0 }));
  },
});

const createFishSlice: StateCreator<
  BearSlice & FishSlice,
  [],
  [],
  FishSlice
> = (set) => ({
  fishes: 0,
  addFish: () => {
    set((state) => ({ fishes: state.fishes + 1 }));
  },
});

type MyState = BearSlice & FishSlice;

const useStore = create<WithLiveblocks<MyState>>()(
  liveblocksMiddleware(
    (set, get, api) => ({
      ...createBearSlice(set, get, api),
      ...createFishSlice(set, get, api),
    }),
    {
      client: createClient({ publicApiKey: "pk_xxx" }),
      presenceMapping: { fishes: true },
    }
  )
);

const fullstate = useStore((s) => s);

// From fish slice
expectType<number>(fullstate.fishes);
expectType<() => void>(fullstate.addFish);

// From bear slice
expectType<() => void>(fullstate.eatFish);

// Liveblocks state
expectAssignable<Function>(fullstate.liveblocks.enterRoom);
expectAssignable<Function>(fullstate.liveblocks.leaveRoom);
expectType<string>(fullstate.liveblocks.room!.id);
