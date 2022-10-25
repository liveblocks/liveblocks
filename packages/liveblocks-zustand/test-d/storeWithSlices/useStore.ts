import create from "zustand";
import { middleware } from "@liveblocks/zustand";
import { createClient } from "@liveblocks/client";

import createBearSlice, { BearSlice } from "./createBearSlice";
import createFishSlice, { FishSlice } from "./createFishSlice";

export type MyState = BearSlice & FishSlice;

const useStore = create(
  middleware<MyState>(
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
