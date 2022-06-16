import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type Presence = {
  cursor: {
    x: number;
    y: number;
  } | null;
  message: string;
};

// Storage not used in this example
type Storage = {};

const {
  RoomProvider,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
} = createRoomContext<Presence, Storage>(client);

export {
  RoomProvider,
  useOthers,
  useBroadcastEvent,
  useEventListener,
  useMyPresence,
};
