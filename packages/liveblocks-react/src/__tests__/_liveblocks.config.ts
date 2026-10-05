import type { LiveList, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";

import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";

type Presence = {
  x: number;
};

type Storage = {
  obj: LiveObject<{
    a: number;
    nested: LiveList<string>;
    localField?: string;
  }>;
};

const client = createClient({
  authEndpoint: "/api/auth",
  lostConnectionTimeout: 200, // Use a very quick 200ms,
  polyfills: {
    WebSocket: MockWebSocket as any,
  },
});

const roomContext = createRoomContext<Presence, Storage>(client);

export const {
  RoomProvider,
  useCanRedo,
  useCanUndo,
  useHistory,
  useIsInsideRoom,
  useMutableStorage,
  useMutation,
  useMyPresence,
  useOthers,
  useRoom,
  useStorage,
  useUndo,
  useThreads,
} = roomContext;

export const { suspense } = roomContext;
