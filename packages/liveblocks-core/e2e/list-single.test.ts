import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import type { ReadonlyJson } from "../src/lib/Json";
import { prepareSingleClientTest } from "./utils";

test(
  "fast consecutive sets on same index",
  prepareSingleClientTest(
    {
      list: new LiveList(["a"]),
    },
    async ({ root, flushSocketMessages, room }) => {
      const states: ReadonlyJson[] = [];
      room.subscribe(root, () => states.push(root.toJSON()), {
        isDeep: true,
      });

      root.get("list").set(0, "b");
      root.get("list").set(0, "c");

      await flushSocketMessages();
      expect(states).toEqual([{ list: ["b"] }, { list: ["c"] }]);
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
      const states: ReadonlyJson[] = [];
      room.subscribe(root, () => states.push(root.toJSON()), {
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
