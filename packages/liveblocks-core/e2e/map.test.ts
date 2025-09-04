import { test } from "vitest";

import { LiveMap } from "../src/crdts/LiveMap";
import { prepareTestsConflicts } from "./utils";

test(
  "remote set conflicts with another set",
  prepareTestsConflicts(
    {
      map: new LiveMap<string, string>(),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("map").set("key", "A");
      root2.get("map").set("key", "B");

      assert(
        { map: new Map([["key", "A"]]) },
        { map: new Map([["key", "B"]]) }
      );

      await wsUtils.flushSocket1Messages();

      assert({ map: new Map([["key", "A"]]) });

      await wsUtils.flushSocket2Messages();

      assert({ map: new Map([["key", "B"]]) });
    }
  )
);

test(
  "remote set conflicts with a delete",
  prepareTestsConflicts(
    {
      map: new LiveMap<string, string>([["key", "A"]]),
    },
    async ({ root1, root2, wsUtils, assert }) => {
      root1.get("map").delete("key");
      root2.get("map").set("key", "B");

      assert({ map: new Map() }, { map: new Map([["key", "B"]]) });

      await wsUtils.flushSocket1Messages();

      assert({ map: new Map() }, { map: new Map([["key", "B"]]) });

      await wsUtils.flushSocket2Messages();

      assert({ map: new Map([["key", "B"]]) });
    }
  )
);
