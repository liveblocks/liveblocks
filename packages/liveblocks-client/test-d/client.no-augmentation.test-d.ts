import type { Json, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { expectType } from "tsd";

const client = createClient({ publicApiKey: "pk_xxx" });

// .enterRoom()
{
  {
    const { room } = client.enterRoom("my-room", {
      initialPresence: { foo: null },
    });
    expectType<JsonObject>(room.getPresence());
  }

  {
    const { room } = client.enterRoom("my-room", {
      initialPresence: { bar: [1, 2, 3] },
    });
    expectType<JsonObject>(room.getPresence());
  }

  {
    const { room } = client.enterRoom("my-room", {
      initialPresence: { cursor: { x: 1, y: 2 } },
    });
    expectType<Json | undefined>(room.getPresence()?.cursor);
  }
}
