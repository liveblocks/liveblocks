import { createClient, LiveList } from "@liveblocks/client";
import { describe, test } from "vitest";

type MyPresence = {
  cursor: { x: number; y: number };
};

declare global {
  interface Liveblocks {
    Presence: MyPresence;

    // DO NOT ADD ANYTHING HERE!
    // This test file contains tests that _only_ have Presence set
  }
}

describe("createClient with only Presence augmentation", () => {
  describe(".enterRoom()", () => {
    test("should require initial presence and allow valid calls", () => {
      const client = createClient({ publicApiKey: "pk_xxx" });

      // @ts-expect-error - Initial presence is required
      client.enterRoom("room");
      // @ts-expect-error - Initial presence is required
      client.enterRoom("room", {});
      // @ts-expect-error - Initial presence is required
      client.enterRoom("room", { initialPresence: {} });
      // @ts-expect-error - Invalid initial presence shape
      client.enterRoom("room", { initialPresence: { foo: "" } });
      // @ts-expect-error - Invalid initial presence shape
      client.enterRoom("room", { initialPresence: { bar: [1, 2, 3] } });

      client.enterRoom("room", {
        initialPresence: { cursor: { x: 1, y: 2 } },
      });
      client.enterRoom("room", {
        initialPresence: { cursor: { x: 1, y: 2 } },
        initialStorage: {
          foo: new LiveList(["I", "can", new LiveList(["be", "whatever"])]),
        },
      });
    });
  });
});
