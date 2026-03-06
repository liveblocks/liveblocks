import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { lsonToJson } from "../src/immutable";
import type { Json } from "../src/lib/Json";
import { prepareSingleClientTest } from "./utils";

const isWasm = process.env.LIVEBLOCKS_ENGINE === "wasm";

test(
  "fast consecutive sets on same index",
  prepareSingleClientTest(
    {
      list: new LiveList(["a"]),
    },
    async ({ root, flushSocketMessages, room }) => {
      const states: Json[] = [];
      room.subscribe(root, () => states.push(lsonToJson(root)), {
        isDeep: true,
      });

      root.get("list").set(0, "b");
      root.get("list").set(0, "c");

      await flushSocketMessages();
      expect(states).toEqual([{ list: ["b"] }, { list: ["c"] }]);
    }
  )
);

// WASM: skipped because JS LiveList created in user code is not connected
// to the Rust document (requires creating nested CRDTs via the WASM handle).
test.skipIf(isWasm)(
  "create list with item + set",
  prepareSingleClientTest(
    {
      list: null,
    } as { list: LiveList<string> | null },
    async ({ root, flushSocketMessages, room }) => {
      const states: Json[] = [];
      room.subscribe(root, () => states.push(lsonToJson(root)), {
        isDeep: true,
      });

      const liveList = new LiveList<string>(["a"]);
      root.set("list", liveList);

      liveList.set(0, "b");

      await flushSocketMessages();
      expect(states).toEqual([{ list: ["a"] }, { list: ["b"] }]);
    }
  )
);
