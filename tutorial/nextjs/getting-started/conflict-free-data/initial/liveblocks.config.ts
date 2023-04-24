import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

// Storage types

export const {
  RoomProvider,
  // ...
} = createRoomContext<{}, {}, {}, {}>(client);
