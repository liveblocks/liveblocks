import { createClient, LiveObject } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: "{% LIVEBLOCKS_PUBLIC_KEY %}",
});

// Storage types
type Storage = {
  person: LiveObject<{
    name: string;
    age: number;
  }>;
};

export const {
  RoomProvider,
  useStorage, // ✅
} = createRoomContext<{}, Storage, {}, {}>(client);
