import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";
import { describe, test } from "vitest";

type MyStorage = {
  animals: LiveList<string>;
  scores?: LiveMap<string, number>;
  person?: LiveObject<{ name: string; age: number }>;
};

declare global {
  interface Liveblocks {
    Storage: MyStorage;

    // DO NOT ADD ANYTHING HERE!
    // This test file contains tests that _only_ have Storage set
  }
}

describe("createClient with only Storage augmentation", () => {
  describe(".enterRoom()", () => {
    test("should require initial storage and allow valid calls", () => {
      const client = createClient({ publicApiKey: "pk_xxx" });

      // @ts-expect-error - Initial storage is required
      client.enterRoom("room");
      // @ts-expect-error - Initial storage is required
      client.enterRoom("room", {});
      // @ts-expect-error - Initial storage is required
      client.enterRoom("room", { initialStorage: {} });
      // @ts-expect-error - Invalid initial storage shape
      client.enterRoom("room", { initialStorage: { foo: "" } });
      // @ts-expect-error - Invalid initial storage shape
      client.enterRoom("room", { initialStorage: { bar: [1, 2, 3] } });

      client.enterRoom("room", {
        initialStorage: { animals: new LiveList(["🦊"]) },
      });
      client.enterRoom("room", {
        initialPresence: { can: ["be", "whatever"] },
        initialStorage: { animals: new LiveList(["🦊"]) },
      });
    });
  });
});
