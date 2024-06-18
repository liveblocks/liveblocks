import {
  createClient,
  LiveList,
  LiveMap,
  LiveObject,
} from "@liveblocks/client";
import { expectError, expectType } from "tsd";

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

// .enterRoom()
(async function () {
  // Both initial presence + storage are required
  expectError(client.enterRoom("room"));
  expectError(client.enterRoom("room", {}));
  expectError(client.enterRoom("room", { initialPresence: {} }));
  expectError(client.enterRoom("room", { initialPresence: { foo: "" } }));
  expectError(
    client.enterRoom("room", { initialPresence: { bar: [1, 2, 3] } })
  );

  // It's OK only if both are (correctly) set
  const { room } = client.enterRoom("room", {
    initialPresence: { cursor: { x: 1, y: 2 } },
    initialStorage: { animals: new LiveList(["🦊"]) },
  });
  expectType<number>(room.getPresence()?.cursor.x);
  expectType<number>(room.getPresence()?.cursor.y);
  expectType<LiveList<string>>((await room.getStorage()).root.get("animals"));

  // Invalid presence
  expectError(
    client.enterRoom("room", {
      initialPresence: { cursor: { x: 1, y: "2" } },
      initialStorage: { animals: new LiveList(["🦊"]) },
    })
  );

  // Invalid storage
  expectError(
    client.enterRoom("room", {
      initialPresence: { cursor: { x: 1, y: 2 } },
      initialStorage: { animals: new LiveList([42]) },
    })
  );
})();
