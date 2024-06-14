import type { Json, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { expectError, expectType } from "tsd";

const client = createClient({ publicApiKey: "pk_xxx" });

// .enterRoom()
{
  {
    // No options at all is fine
    // XXX Enable this test as well, once all the others work!
    // const { room } = client.enterRoom("my-room");
    // expectType<JsonObject>(room.getPresence());
  }

  {
    // No initial props is also fine
    const { room } = client.enterRoom("my-room", { autoConnect: true });
    expectType<JsonObject>(room.getPresence());
  }

  {
    // No options at all is fine if not using the global presence
    const { room } = client.enterRoom<JsonObject>("my-room", {
      autoConnect: true,
    });
    expectType<JsonObject>(room.getPresence());
  }

  {
    // Initial presence is required
    expectError<{ foo: string }>(client.enterRoom("room"));
    expectError<{ foo: string }>(client.enterRoom("room", {}));
    expectError<{ foo: string }>(
      client.enterRoom("room", { initialPresence: {} })
    );
    expectError<{ foo: string }>(
      client.enterRoom("room", { initialPresence: { bar: "" } })
    );
  }

  {
    // Initial presence is not required when it has only optional fields
    // XXX Enable this test as well, once all the others work!
    // client.enterRoom<{ foo?: string; bar?: number }>("room");
    client.enterRoom<{ foo?: string; bar?: number }>("room", {});
    client.enterRoom<{ foo?: string; bar?: number }>("room", {
      initialPresence: {},
    });
    client.enterRoom<{ foo?: string; bar?: number }>("room", {
      initialPresence: { foo: "" },
    });
  }

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
