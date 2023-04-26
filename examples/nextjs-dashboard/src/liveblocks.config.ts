import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

type CursorPosition = {
  x: number;
  y: number;
};

type Presence = {
  selectedDataset: { cardId: string; dataKey: string } | null;
  cursor: CursorPosition | null;
  cardId: string | null;
};

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useUpdateMyPresence,
  useOthersMapped,
  useOthersConnectionIds,
} = createRoomContext<Presence /* UserMeta, RoomEvent */>(client);
