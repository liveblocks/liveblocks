import { expect, test } from "vitest";

import { LiveMap } from "../src/crdts/LiveMap";
import type { ReadonlyJson } from "../src/lib/Json";
import { prepareSingleClientTest } from "./utils";

test(
  "fast consecutive sets on same key",
  prepareSingleClientTest(
    {
      map: new LiveMap<string, string>(),
    },
    async ({ root, flushSocketMessages, room }) => {
      const states: ReadonlyJson[] = [];
      room.subscribe(root, () => states.push(root.toJSON()), {
        isDeep: true,
      });

      root.get("map").set("key", "a");
      root.get("map").set("key", "b");

      await flushSocketMessages();
      expect(states).toEqual([{ map: { key: "a" } }, { map: { key: "b" } }]);
    }
  )
);
