import type { JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

import { createLiveblocksFlow, type LiveblocksFlow } from "../flow";
import MockWebSocket from "./_MockWebSocket";

type Storage = {
  flow: LiveblocksFlow;
};

const client = createClient({
  authEndpoint: "/api/auth",
  lostConnectionTimeout: 200,
  polyfills: {
    WebSocket: MockWebSocket as unknown as typeof WebSocket,
  },
});

export const { RoomProvider, useMutation, useStorage } = createRoomContext<
  JsonObject,
  Storage
>(client);

export { createLiveblocksFlow };
