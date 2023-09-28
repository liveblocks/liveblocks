import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth",
  lostConnectionTimeout: 200, // Use a very quick 200ms
});

export const { RoomProvider, useThreads } = createRoomContext(client);
