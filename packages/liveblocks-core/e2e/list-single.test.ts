import { assertEq } from "tosti";
import { test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { lsonToJson } from "../src/immutable";
import type { Json } from "../src/lib/Json";
import { prepareSingleClientTest } from "./utils";

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
      assertEq(states, [{ list: ["b"] }, { list: ["c"] }]);
    }
  )
);

test(
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
      assertEq(states, [{ list: ["a"] }, { list: ["b"] }]);
    }
  )
);
