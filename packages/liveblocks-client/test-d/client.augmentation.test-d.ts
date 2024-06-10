import { createClient } from "@liveblocks/client";
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
  {
    expectError(client.enterRoom("room", { initialPresence: { foo: "" } }));
    expectError(
      client.enterRoom("room", { initialPresence: { bar: [1, 2, 3] } })
    );
    expectError(
      client.enterRoom("room", {
        initialPresence: { cursor: { x: 1, y: "2" } },
      })
    );
  }

  {
    const { room } = client.enterRoom("room", {
      initialPresence: { cursor: { x: 1, y: 2 } },
    });
    expectType<number>(room.getPresence()?.cursor.x);
    expectType<number>(room.getPresence()?.cursor.y);
  }
}
