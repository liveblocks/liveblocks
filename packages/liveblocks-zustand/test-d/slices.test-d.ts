import type { GetState, SetState } from "zustand";
import create from "zustand";
import { middleware } from "@liveblocks/zustand";
import { createClient } from "@liveblocks/client";

import { expectType, expectAssignable } from "tsd";

type BearSlice = {
  eatFish: () => void;
};

const createBearSlice = (set: SetState<MyState>, _get: GetState<MyState>) => ({
  eatFish: () => {
    set((prev) => ({ fishes: prev.fishes > 1 ? prev.fishes - 1 : 0 }));
  },
});

type FishSlice = {
  fishes: number;
  repopulate: () => void;
};

const maxFishes = 10;

const createFishSlice = (set: SetState<MyState>, _get: GetState<MyState>) => ({
  fishes: maxFishes,
  repopulate: () => {
    set((_prev) => ({ fishes: maxFishes }));
  },
});

type MyState = BearSlice & FishSlice;

const useStore = create(
  middleware<MyState>(
    (set, get) => ({
      ...createBearSlice(set, get),
      ...createFishSlice(set, get),
    }),
    {
      client: createClient({ publicApiKey: "pk_xxx" }),
      presenceMapping: { fishes: true },
    }
  )
);

const store = useStore((s) => s);

// From fish slice
expectType<number>(store.fishes);
expectType<() => void>(store.repopulate);

// From bear slice
expectType<() => void>(store.eatFish);

// Liveblocks state
expectAssignable<Function>(store.liveblocks.enterRoom);
expectAssignable<Function>(store.liveblocks.leaveRoom);
expectType<string>(store.liveblocks.room!.id);
