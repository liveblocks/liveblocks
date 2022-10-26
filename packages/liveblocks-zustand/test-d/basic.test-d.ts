import { createClient, LiveList } from "@liveblocks/client";
import { middleware as liveblocksMiddleware } from "@liveblocks/zustand";
import type { WithLiveblocks } from "@liveblocks/zustand";

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

const useStore = create(
  liveblocksMiddleware<MyState>(
    (set, get, api) => ({
      value: 0,
      setValue: (newValue: number) => {
        const oldValue = get().value;
        expectType<number>(oldValue);

        const liveblocks1 = api.liveblocks;
        expectType<"tagine">(liveblocks1.hahaha);
        // expectType<boolean>(liveblocks1.isStorageLoading);
        // expectAssignable<Function>(liveblocks1.enterRoom);
        // expectAssignable<Function>(liveblocks1.leaveRoom);
        // expectType<string>(liveblocks1.room!.id);

        const liveblocks2 = get().liveblocks;
        expectType<"tagine">(liveblocks2.hahaha);
        // expectType<boolean>(liveblocks2.isStorageLoading);
        // expectAssignable<Function>(liveblocks2.enterRoom);
        // expectAssignable<Function>(liveblocks2.leaveRoom);
        // expectType<string>(liveblocks2.room!.id);

        // Liveblocks state should be available here
        // const {
        //   others: _others,
        //   connection: _connection,
        //   enterRoom: _enterRoom,
        //   leaveRoom: _leaveRoom,
        //   isStorageLoading: _isStorageLoading,
        //   room: _room,
        // } = get().liveblocks;

        // expectError((get().liveblocks = {})); // Readonly

        // const liveblocksState = get().liveblocks;

        // expectError((liveblocksState.room = {} as any)); // Readonly

        // expectError((liveblocksState.others = {} as any)); // Readonly

        // // Presence tests
        // expectType<Presence>(liveblocksState.others[0]!.presence);
        // expectError(liveblocksState.others[0]!.presence.nonexistingProperty);

        // // UserMeta tests
        // expectType<Meta>(liveblocksState.others[0]!.info);
        // expectError(liveblocksState.others[0]!.info.nonexistingProperty);

        // liveblocksState.room?.broadcastEvent({
        //   type: "MESSAGE",
        //   value: "string",
        // });

        // expectError(
        //   liveblocksState.room?.broadcastEvent({
        //     type: "INVALID_MESSAGE",
        //   })
        // );

        // liveblocksState.room?.getStorage().then((storage) => {
        //   storage.root.get("todos");
        //   expectError(storage.root.get("unknown_key"));
        // });

        // Cannot write to liveblocks key
        // expectError(set({ liveblocks: '😈' }));

        return set({ value: newValue });
      },
    }),
    { client, storageMapping: {}, presenceMapping: {} }
  )
);

const liveblocks3 = useStore.getState().liveblocks;
expectType<"tagine">(liveblocks3.hahaha);
// expectType<boolean>(liveblocks3.isStorageLoading);
// expectAssignable<Function>(liveblocks3.enterRoom);
// expectAssignable<Function>(liveblocks3.leaveRoom);
// expectType<string>(liveblocks3.room!.id);

const liveblocks4 = useStore.liveblocks;
expectType<"tagine">(liveblocks4.hahaha);

useStore((s) => {
  const liveblocks5 = s.liveblocks;
  expectType<"tagine">(liveblocks5.hahaha);
  return liveblocks5;
});

// expectError((liveblocks.enterRoom = () => {})); // Readonly
// expectError((liveblocks.leaveRoom = () => {})); // Readonly
// expectError((liveblocks.connection = "open")); // Readonly
// expectError((liveblocks.others = [])); // Readonly
// expectError((liveblocks.isStorageLoading = false)); // Readonly
// expectError((liveblocks.room = {})); // Readonly
