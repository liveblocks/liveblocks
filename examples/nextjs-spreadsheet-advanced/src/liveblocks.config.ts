import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage, UserMeta } from "./types";

const client = createClient({
  authEndpoint: "/api/auth",
});

export const {
  RoomProvider,
  useOthers,
  useUpdateMyPresence,
  useObject,
  useSelf,
  useList,
  useMap,
  useRoom,
} = createRoomContext<Presence, Storage, UserMeta>(client);
