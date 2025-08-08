import type { Immutable } from "../src/types/Immutable";
import { LiveMap } from "../src/crdts/LiveMap";
import { prepareSingleClientTest, prepareTestsConflicts } from "./utils";

describe("LiveMap single client", () => {
  test(
    "remote set conflicts with another set",
    { timeout: 10000 },
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

  // TODO: This test is flaky and occasionally fails in CI--make it more robust
  // See https://github.com/liveblocks/liveblocks/runs/7278076193?check_suite_focus=true#step:6:85
  test.skip(
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
});

describe("LiveMap single client", () => {
  test(
    "fast consecutive sets on same key",
    { timeout: 10000 },
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
});
