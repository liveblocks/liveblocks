import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type Presence = {
  selectedId: string | null;
};

type Storage = {};

const { RoomProvider, useOthers, useUpdateMyPresence } = createRoomContext<
  Presence,
  Storage
>(client);

export { RoomProvider, useOthers, useUpdateMyPresence };
