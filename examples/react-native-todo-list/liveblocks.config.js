import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { decode } from "base-64";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

const client = createClient({
  publicApiKey: PUBLIC_KEY,
  polyfills: {
    atob: decode,
  },
});

const { RoomProvider, useMyPresence, useOthers, useList, useUpdateMyPresence } =
  createRoomContext(client);
export { RoomProvider, useMyPresence, useOthers, useList, useUpdateMyPresence };
