import { createClient } from "@liveblocks/core";
import { expectError, expectType } from "tsd";

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number };
    };
  }
}

const client = createClient({ publicApiKey: "pk_xxx" });

// .enterRoom()
{
  expectError(
    client.enterRoom("my-room", { initialPresence: { cursor: null } })
  );
  const { room } = client.enterRoom("my-room", {
    initialPresence: { cursor: null },
  });
  expectType<number>(room.getPresence()?.cursor?.x);
}

// .enterRoom()
{
  const { room } = client.enterRoom("my-room", {
    initialPresence: { cursor: { x: 1, y: 2 } },
  });
  expectType<number>(room.getPresence()?.cursor.x);
  expectType<number>(room.getPresence()?.cursor.y);
}
