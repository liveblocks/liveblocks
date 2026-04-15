import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "pk_localdev",
  baseUrl: `http://localhost:${process.env.LIVEBLOCKS_DEV_SERVER_PORT ?? 1154}`,
  polyfills: { WebSocket: globalThis.WebSocket },
  lostConnectionTimeout: 200, // Use a very quick 200ms
});

export const { RoomProvider, useThreads } = createRoomContext(client);
