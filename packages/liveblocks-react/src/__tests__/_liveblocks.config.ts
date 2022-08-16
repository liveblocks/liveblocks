import type { LiveList, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";

import { createRoomContext } from "../factory";

type Presence = {
  x: number;
};

type Storage = {
  obj: LiveObject<{
    a: number;
    nested: LiveList<string>;
  }>;
};

const client = createClient({ authEndpoint: "/api/auth" });

export const {
  RoomProvider,
  useMyPresence,
  useObject,
  useOthers,
  useRoom,
  useSelector,
} = createRoomContext<Presence, Storage>(client);
