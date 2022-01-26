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
          const { others, connection, enter, leave, isStorageLoading } =
            get().liveblocks;

          // $ExpectError
          get().liveblocks = {}; // Readonly

          api.getRoom();

          return set({ value: get().value });
        },
      }),
      { client, mapping: {}, presenceMapping: {} }
    ),
    {
      name: "persist-name",
    }
  )
);

const { value, liveblocks } = useStore.getState();

// $ExpectError
liveblocks.enter = () => {}; // Readonly
// $ExpectError
liveblocks.leave = () => {}; // Readonly
// $ExpectError
liveblocks.connection = "open"; // Readonly
// $ExpectError
liveblocks.others = []; // Readonly
// $ExpectError
liveblocks.isStorageLoading = false; // Readonly
// $ExpectError
liveblocks.history = {}; // Readonly
