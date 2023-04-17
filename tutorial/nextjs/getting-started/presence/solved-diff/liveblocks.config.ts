import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

// Presence type
type Presence = {
  cursor: { x: number; y: number } | null;
};

export const {
  RoomProvider,
  useOthers,
  useMyPresence, // ✅
} = createRoomContext<Presence>(client);
