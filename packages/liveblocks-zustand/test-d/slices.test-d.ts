import type { StoreApi } from "zustand";
import create from "zustand";
import { createClient } from "@liveblocks/client";
import { liveblocks as liveblocksMiddleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

import { expectType, expectAssignable } from "tsd";

type BearSlice = {
  eatFish: () => void;
};

type FishSlice = {
  fishes: number;
  repopulate: () => void;
};

const createBearSlice = (
  set: StoreApi<MyState>["setState"],
  _get: StoreApi<MyState>["getState"]
) => ({
  eatFish: () => {
    set((prev) => ({ fishes: prev.fishes > 1 ? prev.fishes - 1 : 0 }));
  },
});

const maxFishes = 10;

const createFishSlice = (
  set: StoreApi<MyState>["setState"],
  _get: StoreApi<MyState>["getState"]
) => ({
  fishes: maxFishes,
  repopulate: () => {
    set((_prev) => ({ fishes: maxFishes }));
  },
});

type MyState = BearSlice & FishSlice;

const useStore = create<WithLiveblocks<MyState>>()(
  liveblocksMiddleware(
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

const fullstate = useStore((s) => s);

// From fish slice
expectType<number>(fullstate.fishes);
expectType<() => void>(fullstate.repopulate);

// From bear slice
expectType<() => void>(fullstate.eatFish);

// Liveblocks state
expectAssignable<Function>(fullstate.liveblocks.enterRoom);
expectAssignable<Function>(fullstate.liveblocks.leaveRoom);
expectType<string>(fullstate.liveblocks.room!.id);
