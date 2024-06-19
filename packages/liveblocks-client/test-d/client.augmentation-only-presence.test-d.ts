import { createClient, LiveList } from "@liveblocks/client";
import { expectError } from "tsd";

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

const client = createClient({ publicApiKey: "pk_xxx" });

// Initial presence is required
expectError(client.enterRoom("room"));
expectError(client.enterRoom("room", {}));
expectError(client.enterRoom("room", { initialPresence: {} }));
expectError(client.enterRoom("room", { initialPresence: { foo: "" } }));
expectError(client.enterRoom("room", { initialPresence: { bar: [1, 2, 3] } }));

// Should be fine
client.enterRoom("room", {
  initialPresence: { cursor: { x: 1, y: 2 } },
});
client.enterRoom("room", {
  initialPresence: { cursor: { x: 1, y: 2 } },
  initialStorage: {
    foo: new LiveList(["I", "can", new LiveList(["be", "whatever"])]),
  },
});
