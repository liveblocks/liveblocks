import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Create client
const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

// Create room context
export const { RoomProvider } = createRoomContext(client);
