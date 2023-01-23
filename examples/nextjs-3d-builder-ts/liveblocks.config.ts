import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage, UserMeta } from "./types";
import React from "react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY,
});

export const { RoomProvider, useStorage, useMutation } =
  createRoomContext<Presence, Storage, UserMeta>(client);



