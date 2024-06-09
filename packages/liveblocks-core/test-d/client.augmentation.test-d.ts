import { createClient } from "@liveblocks/core";
import { expectError, expectType } from "tsd";

type MyPresence = {
  cursor: { x: number; y: number };
};

declare global {
  interface Liveblocks {
    Presence: MyPresence;
  }
}

const client = createClient({ publicApiKey: "pk_xxx" });

// .enterRoom()
{
  expectError(
    client.enterRoom("my-room", { initialPresence: { cursor: null } })
  );
  expectError(
    client.enterRoom("my-room", {
      initialPresence: { cursor: { x: 1, y: "2" } },
    })
  );
}

// .enterRoom()
{
  const { room } = client.enterRoom("my-room", {
    initialPresence: { cursor: { x: 1, y: 2 } },
  });
  expectType<number>(room.getPresence()?.cursor.x);
  expectType<number>(room.getPresence()?.cursor.y);
}
