import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";
import { expectError } from "tsd";

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

const client = createClient({ publicApiKey: "pk_xxx" });

// Initial storage is required
expectError(client.enterRoom("room"));
expectError(client.enterRoom("room", {}));
expectError(client.enterRoom("room", { initialStorage: {} }));
expectError(client.enterRoom("room", { initialStorage: { foo: "" } }));
expectError(client.enterRoom("room", { initialStorage: { bar: [1, 2, 3] } }));

// Should be fine
client.enterRoom("room", {
  initialStorage: { animals: new LiveList(["🦊"]) },
});
client.enterRoom("room", {
  initialPresence: { can: ["be", "whatever"] },
  initialStorage: { animals: new LiveList(["🦊"]) },
});
