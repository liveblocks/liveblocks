import { createClient } from "@liveblocks/client";
import create from "zustand";
import { middleware } from "@liveblocks/zustand";
import { persist } from "zustand/middleware";

type BasicStore = {
  value: number;
  setValue: (newValue: number) => void;
};

const client = createClient({ authEndpoint: "/api/auth" });

const useStore = create(
  persist(
    middleware<BasicStore>(
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
