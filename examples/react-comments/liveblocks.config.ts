import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

export const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
});

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext(client);

export { RoomProvider, useThreads };
