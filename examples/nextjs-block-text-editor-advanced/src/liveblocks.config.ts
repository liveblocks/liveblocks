import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { Presence, UserMeta, Storage } from "./types";

const client = createClient({
  authEndpoint: "/api/auth",
});

const {
  RoomProvider,
  useMyPresence,
  useObject,
  useOthers,
  useRoom,
  useSelf,
  useHistory,
  useList,
  useMap,
  useUpdateMyPresence,
  useBatch,
} = createRoomContext<Presence, Storage, UserMeta>(client);

export {
  RoomProvider,
  useMyPresence,
  useObject,
  useRoom,
  useOthers,
  useSelf,
  useHistory,
  useList,
  useMap,
  useUpdateMyPresence,
  useBatch,
};
