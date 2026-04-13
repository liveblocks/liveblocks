import type { Json, JsonObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { describe, expectTypeOf, test } from "vitest";

describe("createClient without Liveblocks augmentation", () => {
  const client = createClient({ publicApiKey: "pk_xxx" });

  describe(".enterRoom()", () => {
    test("should allow missing options when presence is generic JsonObject", () => {
      {
        const { room } = client.enterRoom("my-room");
        expectTypeOf(room.getPresence()).toEqualTypeOf<JsonObject>();
      }

      {
        const { room } = client.enterRoom("my-room", { autoConnect: true });
        expectTypeOf(room.getPresence()).toEqualTypeOf<JsonObject>();
      }

      {
        const { room } = client.enterRoom<JsonObject>("my-room", {
          autoConnect: true,
        });
        expectTypeOf(room.getPresence()).toEqualTypeOf<JsonObject>();
      }
    });

    test("should require initial presence when Presence has required keys", () => {
      // @ts-expect-error - Initial presence is required
      client.enterRoom<{ foo: string }>("room");
      // @ts-expect-error - Initial presence is required
      client.enterRoom<{ foo: string }>("room", {});
      // @ts-expect-error - Initial presence is required
      client.enterRoom<{ foo: string }>("room", { initialPresence: {} });
      client.enterRoom<{ foo: string }>("room", {
        // @ts-expect-error - Invalid initial presence shape
        initialPresence: { bar: "" },
      });
    });

    test("should allow omitting initial presence when all keys are optional", () => {
      client.enterRoom<{ foo?: string }>("room");
      client.enterRoom<{ foo?: string }>("room", {});
      client.enterRoom<{ foo?: string }>("room", { initialPresence: {} });
      client.enterRoom<{ foo?: string }>("room", {
        // @ts-expect-error - Invalid initial presence shape
        initialPresence: { bar: "" },
      });
    });

    test("should not require initial presence when only optional fields exist", () => {
      client.enterRoom<{ foo?: string; bar?: number }>("room");
      client.enterRoom<{ foo?: string; bar?: number }>("room", {});
      client.enterRoom<{ foo?: string; bar?: number }>("room", {
        initialPresence: {},
      });
      client.enterRoom<{ foo?: string; bar?: number }>("room", {
        initialPresence: { foo: "" },
      });
    });

    test("should accept JSON presence values", () => {
      {
        const { room } = client.enterRoom("my-room", {
          initialPresence: { foo: null },
        });
        expectTypeOf(room.getPresence()).toEqualTypeOf<JsonObject>();
      }

      {
        const { room } = client.enterRoom("my-room", {
          initialPresence: { bar: [1, 2, 3] },
        });
        expectTypeOf(room.getPresence()).toEqualTypeOf<JsonObject>();
      }

      {
        const { room } = client.enterRoom("my-room", {
          initialPresence: { cursor: { x: 1, y: 2 } },
        });
        expectTypeOf(room.getPresence()?.cursor).toEqualTypeOf<
          Json | undefined
        >();
      }
    });
  });
});
