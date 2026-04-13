import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";
import { describe, expectTypeOf, test } from "vitest";

type MyPresence = {
  cursor: { x: number; y: number };
};

type MyStorage = {
  animals: LiveList<string>;
  scores?: LiveMap<string, number>;
  person?: LiveObject<{ name: string; age: number }>;
};

declare global {
  interface Liveblocks {
    Presence: MyPresence;
    Storage: MyStorage;
  }
}

const client = createClient({ publicApiKey: "pk_xxx" });

describe("createClient with both Presence and Storage augmentation", () => {
  describe(".enterRoom()", () => {
    test("should require both presence and storage and allow valid calls", async () => {
      // @ts-expect-error - Initial presence and initial storage are required
      client.enterRoom("room");
      // @ts-expect-error - Initial presence and initial storage are required
      client.enterRoom("room", {});
      // @ts-expect-error - Initial presence and initial storage are required
      client.enterRoom("room", { initialPresence: {} });
      // @ts-expect-error - Invalid initial presence shape
      client.enterRoom("room", { initialPresence: { foo: "" } });
      // @ts-expect-error - Invalid initial presence shape
      client.enterRoom("room", { initialPresence: { bar: [1, 2, 3] } });

      client.enterRoom("room", {
        initialPresence: {
          cursor: {
            x: 1,
            // @ts-expect-error - `y` must be a number
            y: "2",
          },
        },
        initialStorage: { animals: new LiveList(["🦊"]) },
      });

      client.enterRoom("room", {
        initialPresence: { cursor: { x: 1, y: 2 } },
        initialStorage: {
          // @ts-expect-error - `animals` must be `LiveList<string>`
          animals: new LiveList([42]),
        },
      });
    });

    test("should return typed presence and storage values", async () => {
      const { room } = client.enterRoom("room", {
        initialPresence: { cursor: { x: 1, y: 2 } },
        initialStorage: { animals: new LiveList(["🦊"]) },
      });

      expectTypeOf(room.getPresence()?.cursor.x).toEqualTypeOf<number>();
      expectTypeOf(room.getPresence()?.cursor.y).toEqualTypeOf<number>();
      expectTypeOf((await room.getStorage()).root.get("animals")).toEqualTypeOf<
        LiveList<string>
      >();
    });
  });
});
