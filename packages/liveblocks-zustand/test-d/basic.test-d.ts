import { createClient, LiveList } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

import create from "zustand";

import { expectError, expectType } from "tsd";

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
  middleware<MyState, Presence, Storage, BaseUser, RoomEvent>(
    (set, get, _api) => ({
      value: 0,
      setValue: (_newValue: number) => {
        // Liveblocks state should be available here
        const {
          others: _others,
          connection: _connection,
          enterRoom: _enterRoom,
          leaveRoom: _leaveRoom,
          isStorageLoading: _isStorageLoading,
          room: _room,
        } = get().liveblocks;

        expectError((get().liveblocks = {})); // Readonly

        const liveblocksState = get().liveblocks;

        expectError((liveblocksState.room = {} as any)); // Readonly

        expectError((liveblocksState.others = {} as any)); // Readonly

        // Presence tests
        expectType<Presence>(liveblocksState.others[0]!.presence);
        expectError(liveblocksState.others[0]!.presence.nonexistingProperty);

        // UserMeta tests
        expectType<Meta>(liveblocksState.others[0]!.info);
        expectError(liveblocksState.others[0]!.info.nonexistingProperty);

        liveblocksState.room?.broadcastEvent({
          type: "MESSAGE",
          value: "string",
        });

        expectError(
          liveblocksState.room?.broadcastEvent({
            type: "INVALID_MESSAGE",
          })
        );

        liveblocksState.room?.getStorage().then((storage) => {
          storage.root.get("todos");
          expectError(storage.root.get("unknown_key"));
        });

        return set({ value: get().value });
      },
    }),
    { client, storageMapping: {}, presenceMapping: {} }
  )
);

const { liveblocks } = useStore.getState();

expectType<(roomId: string, initialState: Partial<MyState>) => void>(
  liveblocks.enterRoom
);

expectError((liveblocks.enterRoom = () => {})); // Readonly
expectError((liveblocks.leaveRoom = () => {})); // Readonly
expectError((liveblocks.connection = "open")); // Readonly
expectError((liveblocks.others = [])); // Readonly
expectError((liveblocks.isStorageLoading = false)); // Readonly
expectError((liveblocks.room = {})); // Readonly
