import { createClient, LiveList } from "@liveblocks/client";
import {
  LiveblocksState,
  Mapping,
  middleware as liveblocksMiddleware,
} from "@liveblocks/zustand";
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

const useStore = create<
  LiveblocksState<MyState, Presence, Storage, BaseUser, RoomEvent>
>()(
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

            // Presence tests
            expectType<Presence>(state.liveblocks.others[0]!.presence);
            expectError(
              state.liveblocks.others[0]!.presence.nonexistingProperty
            );

            // UserMeta tests
            expectType<Meta>(state.liveblocks.others[0]!.info);
            expectError(state.liveblocks.others[0]!.info.nonexistingProperty);

            expectError(
              state.liveblocks.room?.broadcastEvent({
                type: "INVALID_MESSAGE",
              })
            );

            state.liveblocks.room?.getStorage().then((storage) => {
              storage.root.get("todos");
              expectError(storage.root.get("unknown_key"));
            });

            return set({ value: newValue });
          },
        }),
        { client, storageMapping: {}, presenceMapping: { value: true } }
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
expectType<Presence>(state.liveblocks.others[0]!.presence);
expectError(state.liveblocks.others[0]!.presence.nonexistingProperty);
expectType<Meta>(state.liveblocks.others[0]!.info);
expectError(state.liveblocks.others[0]!.info.nonexistingProperty);
expectError(
  state.liveblocks.room?.broadcastEvent({
    type: "INVALID_MESSAGE",
  })
);
state.liveblocks.room?.getStorage().then((storage) => {
  storage.root.get("todos");
  expectError(storage.root.get("unknown_key"));
});

/**
 * Selected state
 */
useStore((state) => {
  expectType<number>(state.value);
  expectType<(newValue: number) => void>(state.setValue);
  expectType<boolean>(state.liveblocks.isStorageLoading);
  expectType<Presence>(state.liveblocks.others[0]!.presence);
  expectError(state.liveblocks.others[0]!.presence.nonexistingProperty);
  expectType<Meta>(state.liveblocks.others[0]!.info);
  expectError(state.liveblocks.others[0]!.info.nonexistingProperty);
  expectError(
    state.liveblocks.room?.broadcastEvent({
      type: "INVALID_MESSAGE",
    })
  );
  state.liveblocks.room?.getStorage().then((storage) => {
    storage.root.get("todos");
    expectError(storage.root.get("unknown_key"));
  });
  return state;
});

// Invalid configuration
expectError(
  create<LiveblocksState<MyState, Presence, Storage, BaseUser, RoomEvent>>()(
    devtools(
      persist(
        liveblocksMiddleware(
          (set, get, api) => ({
            value: 0,
            setValue: (newValue: number) => set({ value: newValue }),
          }),
          { client, storageMapping: {}, presenceMapping: { unknownKey: true } }
        )
      )
    )
  )
);
