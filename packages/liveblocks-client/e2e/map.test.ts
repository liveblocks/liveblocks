import type { Json } from "../src";
import { LiveMap } from "../src";
import { lsonToJson } from "../src/immutable";
import { prepareSingleClientTest, prepareTestsConflicts } from "./utils";

describe("LiveMap single client", () => {
  test(
    "remote set conflicts with another set",
    prepareTestsConflicts(
      {
        map: new LiveMap<string, string>(),
      },
      async ({ root1, root2, wsUtils, assertImmutable }) => {
        root1.get("map").set("key", "A");
        root2.get("map").set("key", "B");

        assertImmutable(
          { map: new Map([["key", "A"]]) },
          { map: new Map([["key", "B"]]) }
        );

        await wsUtils.flushSocket1Messages();

        assertImmutable({ map: new Map([["key", "A"]]) });

        await wsUtils.flushSocket2Messages();

        assertImmutable({ map: new Map([["key", "B"]]) });
      }
    )
  );

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/7278076193?check_suite_focus=true#step:6:85
  test.skip(
    "remote set conflicts with a delete",
    prepareTestsConflicts(
      {
        map: new LiveMap<string, string>([["key", "A"]]),
      },
      async ({ root1, root2, wsUtils, assertImmutable }) => {
        root1.get("map").delete("key");
        root2.get("map").set("key", "B");

        assertImmutable({ map: new Map() }, { map: new Map([["key", "B"]]) });

        await wsUtils.flushSocket1Messages();

        assertImmutable({ map: new Map() }, { map: new Map([["key", "B"]]) });

        await wsUtils.flushSocket2Messages();

        assertImmutable({ map: new Map([["key", "B"]]) });
      }
    )
  );
});

describe("LiveMap single client", () => {
  test(
    "fast consecutive sets on same key",
    prepareSingleClientTest(
      {
        map: new LiveMap<string, string>(),
      },
      async ({ root, flushSocketMessages, room }) => {
        const states: Json[] = [];
        room.subscribe(root, () => states.push(lsonToJson(root)), {
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
});
