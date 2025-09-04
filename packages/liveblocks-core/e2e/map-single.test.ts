import { expect, test } from "vitest";

import { LiveMap } from "../src/crdts/LiveMap";
import type { Immutable } from "../src/types/Immutable";
import { prepareSingleClientTest } from "./utils";

test(
  "fast consecutive sets on same key",
  prepareSingleClientTest(
    {
      map: new LiveMap<string, string>(),
    },
    async ({ root, flushSocketMessages, room }) => {
      const states: Immutable[] = [];
      room.subscribe(root, () => states.push(root.toImmutable()), {
        isDeep: true,
      });

      root.get("map").set("key", "A");
      root.get("map").set("key", "B");

      await flushSocketMessages();

      expect(states).toEqual([
        { map: new Map([["key", "A"]]) },
        { map: new Map([["key", "B"]]) },
      ]);
    }
  )
);
