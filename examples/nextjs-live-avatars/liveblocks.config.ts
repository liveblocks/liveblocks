import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth",
});

// Presence not used in this example
type Presence = {};

// Storage not used in this example
type Storage = {};

type UserMeta = {
  id: string;
  info: {
    name: string;
    picture: string;
  };
};

const { RoomProvider, useOthers, useSelf } = createRoomContext<
  Presence,
  Storage,
  UserMeta
>(client);

export { RoomProvider, useOthers, useSelf };
