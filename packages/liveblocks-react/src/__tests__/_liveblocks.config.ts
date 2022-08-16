import type { LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";

import { createRoomContext } from "../factory";

type Presence = {
  x: number;
};

type Storage = {
  obj: LiveObject<{
    a: number;
  }>;
};

const client = createClient({ authEndpoint: "/api/auth" });

export const { RoomProvider, useMyPresence, useObject, useOthers, useRoom } =
  createRoomContext<Presence, Storage>(client);
