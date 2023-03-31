import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

// Create client
const client = createClient({
  throttle: 16,
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

// Create room context
export const {
  RoomProvider,
  useOthersConnectionIds,
  useSelf,
  useOthersMapped,
  useUpdateMyPresence,
} = createRoomContext<Presence, {}, {}, {}>(client);
