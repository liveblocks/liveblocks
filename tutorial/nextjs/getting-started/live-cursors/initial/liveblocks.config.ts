import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

export const {
  RoomProvider,
  useMyPresence,
  // ...
} = createRoomContext<Presence>(client);
