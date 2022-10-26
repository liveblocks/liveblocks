import { createClient, LiveList } from "@liveblocks/client";
import { middleware as liveblocksMiddleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";
import { devtools, persist } from "zustand/middleware";

import create from "zustand";

import { expectAssignable, expectError, expectType } from "tsd";

type MyState = {
  value: number;
  setValue: (newValue: number) => void;
};

type Presence = {
  cursor: { x: number; y: number };
};

type Storage = {
  todos: LiveList<{ text: string }>;
};

type Meta = {
  name: string;
};

type BaseUser = {
  info: Meta;
};

type RoomEvent = {
  type: "MESSAGE";
  value: string;
};

const client = createClient({ authEndpoint: "/api/auth" });

const useStore = create<WithLiveblocks<MyState>>()(
  devtools(
    persist(
      liveblocksMiddleware(
        (set, get, api) => ({
          value: 0,
          setValue: (newValue: number) => {
            /**
             * Inner state
             */
            const state = get();
            expectType<number>(state.value);
            expectType<(newValue: number) => void>(state.setValue);
            expectType<boolean>(state.liveblocks.isStorageLoading);

            return set({ value: newValue });
          },
        }),
        { client, storageMapping: {}, presenceMapping: {} }
      )
    )
  )
);

/**
 * External state
 */
const state = useStore.getState();
expectType<number>(state.value);
expectType<(newValue: number) => void>(state.setValue);
expectType<boolean>(state.liveblocks.isStorageLoading);

/**
 * Selected state
 */
useStore((state) => {
  expectType<number>(state.value);
  expectType<(newValue: number) => void>(state.setValue);
  expectType<boolean>(state.liveblocks.isStorageLoading);
  return state;
});
