import { test } from "vitest";

import { LiveMap } from "../src/crdts/LiveMap";
import { prepareTestsConflicts } from "./utils";

test(
  "remote set conflicts with another set",
  prepareTestsConflicts(
    { map: new LiveMap<string, string>() },

    async ({ root1, root2, control, assert }) => {
      root1.get("map").set("key", "a");
      root2.get("map").set("key", "b");
      assert({ map: { key: "a" } }, { map: { key: "b" } });

      await control.flushA();
      assert({ map: { key: "a" } });

      await control.flushB();
      assert({ map: { key: "b" } });
    }
  )
);

test(
  "remote set conflicts with a delete",
  prepareTestsConflicts(
    { map: new LiveMap<string, string>([["key", "a"]]) },

    async ({ root1, root2, control, assert }) => {
      root1.get("map").delete("key");
      root2.get("map").set("key", "b");
      assert(
        { map: {} }, //
        { map: { key: "b" } }
      );

      await control.flushA();
      assert(
        { map: {} }, //
        { map: { key: "b" } }
      );

      await control.flushB();
      assert({ map: { key: "b" } });
    }
  )
);
