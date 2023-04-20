import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
  throttle: 16,
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

export const {
  RoomProvider,
  useMyPresence,
  useOthers, // ✅
} = createRoomContext<Presence>(client);
