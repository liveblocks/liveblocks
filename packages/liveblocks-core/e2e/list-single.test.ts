import { expect, test } from "vitest";

import { LiveList } from "../src/crdts/LiveList";
import { lsonToJson } from "../src/immutable";
import type { Json } from "../src/lib/Json";
import { prepareSingleClientTest } from "./utils";

test(
  "fast consecutive sets on same index",
  prepareSingleClientTest(
    {
      list: new LiveList(["A"]),
    },
    async ({ root, flushSocketMessages, room }) => {
      const states: Json[] = [];
      room.subscribe(root, () => states.push(lsonToJson(root)), {
        isDeep: true,
      });

      root.get("list").set(0, "B");
      root.get("list").set(0, "C");

      await flushSocketMessages();

      expect(states).toEqual([{ list: ["B"] }, { list: ["C"] }]);
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

      const liveList = new LiveList<string>(["A"]);
      root.set("list", liveList);

      liveList.set(0, "B");

      await flushSocketMessages();

      expect(states).toEqual([{ list: ["A"] }, { list: ["B"] }]);
    }
  )
);
