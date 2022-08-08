// This file is used to test our types definition with dtslint

import { createClient, LiveList } from "@liveblocks/client";
import create from "zustand";
import { middleware } from "@liveblocks/zustand";
import { persist } from "zustand/middleware";

type BasicStore = {
  value: number;
  setValue: (newValue: number) => void;
};

type Presence = {
  cursor: { x: number; y: number };
};

type Storage = {
  todos: LiveList<{ text: string }>;
};

type BaseUser = {
  info: {
    name: string;
  };
};

type RoomEvent = {
  type: "MESSAGE";
  value: string;
};

const client = createClient({ authEndpoint: "/api/auth" });

const useStore = create(
  persist(
    middleware<BasicStore, Presence, Storage, BaseUser, RoomEvent>(
      (set, get, api) => ({
        value: 0,
        setValue: (newValue: number) => {
          // Liveblocks state should be available here
          const {
            others,
            connection,
            enterRoom,
            leaveRoom,
            isStorageLoading,
            room,
          } = get().liveblocks;

          // $ExpectError
          get().liveblocks = {}; // Readonly

          const liveblocksState = get().liveblocks;

          // $ExpectError
          liveblocksState.room = {} as any; // Readonly

          // $ExpectError
          liveblocksState.others = {} as any; // Readonly

          liveblocksState.others[0].presence?.cursor;

          // $ExpectError
          liveblocksState.others[0].presence?.unknownPresenceProperty;

          liveblocksState.others[0].info.name;

          // $ExpectError
          liveblocksState.others[0].info.unknownUserProperty;

          liveblocksState.room?.broadcastEvent({
            type: "MESSAGE",
            value: "string",
          });

          liveblocksState.room?.broadcastEvent({
            // $ExpectError
            type: "INVALID_MESSAGE",
          });

          liveblocksState.room?.getStorage().then((storage) => {
            storage.root.get("todos");

            // $ExpectError
            storage.root.get("unknown_key");
          });

          return set({ value: get().value });
        },
      }),
      { client, storageMapping: {}, presenceMapping: {} }
    ),
    {
      name: "persist-name",
    }
  )
);

const { value, liveblocks } = useStore.getState();

// $ExpectError
liveblocks.enterRoom = () => {}; // Readonly
// $ExpectError
liveblocks.leaveRoom = () => {}; // Readonly
// $ExpectError
liveblocks.connection = "open"; // Readonly
// $ExpectError
liveblocks.others = []; // Readonly
// $ExpectError
liveblocks.isStorageLoading = false; // Readonly
// $ExpectError
liveblocks.room = {}; // Readonly
