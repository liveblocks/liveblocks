import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage, UserMeta } from "./types";

const client = createClient({
  authEndpoint: "/api/auth",
});

export const { RoomProvider, useRoom, useHistory, useSelf } = createRoomContext<
  Presence,
  Storage,
  UserMeta
>(client);
