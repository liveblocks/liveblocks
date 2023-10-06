import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage, UserMeta } from "./types";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useRoom,
  useHistory,
  useSelf,
  useCanUndo,
  useCanRedo,
} = createRoomContext<Presence, Storage, UserMeta>(client);
