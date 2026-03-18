import type { ClientOptions, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import type { ReactNode } from "react";

import type { LiveblocksFlow } from "../flow";
import { createLiveblocksFlow } from "../flow";
import MockWebSocket from "./_MockWebSocket";

type Storage = {
  flow?: LiveblocksFlow;
  myFlow?: LiveblocksFlow;
};

export function createContextsForTest(options?: {
  initialNodes?: Parameters<typeof createLiveblocksFlow>[0];
  initialEdges?: Parameters<typeof createLiveblocksFlow>[1];
}) {
  const clientOptions: ClientOptions = {
    polyfills: {
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
    },
    authEndpoint: async () => {
      const token = await generateFakeJwt({ userId: "userId" });
      return { token };
    },
  };

  const client = createClient(clientOptions);
  const room = createRoomContext<JsonObject, Storage>(client);

  const initialNodes = options?.initialNodes ?? [];
  const initialEdges = options?.initialEdges ?? [];

  function AllTheProviders(props: { children: ReactNode }) {
    return (
      <room.RoomProvider
        id="room"
        initialPresence={() => ({})}
        initialStorage={() => ({
          flow: createLiveblocksFlow(initialNodes, initialEdges),
        })}
      >
        {props.children}
      </room.RoomProvider>
    );
  }

  return {
    room,
    client,
    AllTheProviders,
  };
}

export function generateFakeJwt(options: { userId: string }) {
  return Promise.resolve(
    `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(
      JSON.stringify({
        k: "acc",
        pid: "test_pid",
        uid: options.userId,
        perms: { "*": ["room:write"] },
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000 + 3600),
      })
    )}.${btoa("fake_signature")}`
  );
}

export { createLiveblocksFlow } from "../flow";
