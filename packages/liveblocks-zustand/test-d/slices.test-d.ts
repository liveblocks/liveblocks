import type { StateCreator } from "zustand";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createClient } from "@liveblocks/client";
import { liveblocks as liveblocksMiddleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import { describe, expectTypeOf, test } from "vitest";

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
  subscribeWithSelector(
    liveblocksMiddleware(
      (set, get, api) => ({
        ...createBearSlice(set, get, api),
        ...createFishSlice(set, get, api),
      }),
      {
        client: createClient({ publicApiKey: "pk_xxx" }),
        storageMapping: {
          fishes: true,
          bears: true,
        },
      }
    )
  )
);

describe("WithLiveblocks middleware with slices", () => {
  test("should expose slice fields and Liveblocks API from getState()", () => {
    const fullstate = useStore.getState();

    // From fish slice
    expectTypeOf(fullstate.fishes).toEqualTypeOf<number>();
    expectTypeOf(fullstate.addFish).toEqualTypeOf<() => void>();

    // From bear slice
    expectTypeOf(fullstate.eatFish).toEqualTypeOf<() => void>();

    // Liveblocks state
    expectTypeOf(fullstate.liveblocks.enterRoom).toExtend<Function>();
    expectTypeOf(fullstate.liveblocks.leaveRoom).toExtend<Function>();
    expectTypeOf(fullstate.liveblocks.room!.id).toEqualTypeOf<string>();
  });

  test("should return typed state in subscribe callback", () => {
    expectTypeOf(
      useStore.subscribe(
        (state) => state.bears,
        (bears) => {
          expectTypeOf(bears).toEqualTypeOf<number>();
        }
      )
    ).toEqualTypeOf<() => void>();
  });
});
