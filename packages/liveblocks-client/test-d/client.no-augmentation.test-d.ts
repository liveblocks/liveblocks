import type { Json, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { expectError, expectType } from "tsd";

const client = createClient({ publicApiKey: "pk_xxx" });

// .enterRoom()
{
  {
    // No options at all is fine
    const { room } = client.enterRoom("my-room");
    expectType<JsonObject>(room.getPresence());
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
    expectError(client.enterRoom<{ foo: string }>("room"));
    expectError(client.enterRoom<{ foo: string }>("room", {}));
    expectError(
      client.enterRoom<{ foo: string }>("room", { initialPresence: {} })
    );
    expectError(
      client.enterRoom<{ foo: string }>("room", {
        initialPresence: { bar: "" },
      })
    );
  }

  {
    // Initial presence is required... unless it's not required
    client.enterRoom<{ foo?: string }>("room");
    client.enterRoom<{ foo?: string }>("room", {});
    client.enterRoom<{ foo?: string }>("room", { initialPresence: {} });
    expectError(
      client.enterRoom<{ foo?: string }>("room", {
        initialPresence: { bar: "" },
      })
    );
  }

  {
    // Initial presence is not required when it has only optional fields
    client.enterRoom<{ foo?: string; bar?: number }>("room");
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
