import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, Storage } from "./src/types";

const client = createClient({
  authEndpoint: "/api/auth",
});

const {
  useMyPresence,
  useOthers,
  useList,
  RoomProvider,
  useMap,
  useHistory,
  useBatch,
  useRoom,
} = createRoomContext<Presence, Storage>(client);

export {
  useMyPresence,
  useOthers,
  useList,
  RoomProvider,
  useMap,
  useHistory,
  useBatch,
  useRoom,
};
