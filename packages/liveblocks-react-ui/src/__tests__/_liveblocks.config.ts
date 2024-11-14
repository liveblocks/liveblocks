import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { getUmbrellaStoreForClient } from "@liveblocks/react/_private";

const client = createClient({
  authEndpoint: "/api/auth",
  lostConnectionTimeout: 200, // Use a very quick 200ms
});

const store = getUmbrellaStoreForClient(client);
const { RoomProvider, useThreads } = createRoomContext(client);
export { client, RoomProvider, store, useThreads };
