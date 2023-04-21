import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

// Event types
type RoomEvent = {
  type: "TOAST";
  message: string;
};

export const {
  RoomProvider,
  useBroadcastEvent, // ✅
  useEventListener, // ✅
} = createRoomContext<{}, {}, {}, RoomEvent>(client);
