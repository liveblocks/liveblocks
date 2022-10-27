import type { GetState, SetState } from "zustand";
import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

import { expectType, expectAssignable } from "tsd";

type BearSlice = {
  eatFish: () => void;
};

type FishSlice = {
  fishes: number;
  repopulate: () => void;
};

const createBearSlice = (set: SetState<MyState>, _get: GetState<MyState>) => ({
  eatFish: () => {
    set((prev) => ({ fishes: prev.fishes > 1 ? prev.fishes - 1 : 0 }));
  },
});

const maxFishes = 10;

const createFishSlice = (set: SetState<MyState>, _get: GetState<MyState>) => ({
  fishes: maxFishes,
  repopulate: () => {
    set((_prev) => ({ fishes: maxFishes }));
  },
});

type MyState = BearSlice & FishSlice;

const useStore = create<WithLiveblocks<MyState>>()(
  middleware(
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
