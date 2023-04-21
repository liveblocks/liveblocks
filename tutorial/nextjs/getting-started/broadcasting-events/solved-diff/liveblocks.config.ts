import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

type Presence = {
  cursor: { x: number; y: number } | null;
};

type Storage = {};

type UserMeta = {};

type RoomEvent = {
  type: "TOAST";
  message: string;
};

export const {
  RoomProvider,
  useBroadcastEvent, // ✅
  useEventListener, // ✅
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);
