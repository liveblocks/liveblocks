import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  authEndpoint: "/api/auth",
});

const { RoomProvider, useOthers, useSelf } = createRoomContext(client);

export { RoomProvider, useOthers, useSelf };
