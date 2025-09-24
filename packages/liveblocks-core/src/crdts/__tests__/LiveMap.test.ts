import { assertEq, assertSame, assertThrows, literally } from "tosti";
import { describe, test, vi } from "vitest";

import {
  createSerializedList,
  createSerializedMap,
  createSerializedObject,
  createSerializedRegister,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  replaceRemoteStorageAndReconnect,
} from "../../__tests__/_utils";
import { waitUntilStorageUpdate } from "../../__tests__/_waitUtils";
import { kInternal } from "../../internal";
import { Permission } from "../../protocol/AuthToken";
import { OpCode } from "../../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../../protocol/SerializedCrdt";
import { CrdtType } from "../../protocol/SerializedCrdt";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";

describe("LiveMap", () => {
  describe("not attached", () => {
    test("basic operations with LiveObjects", () => {
      const map = new LiveMap([["first" as string, new LiveObject({ a: 0 })]]);
      assertSame(map.get("first")?.get("a"), 0);

      map.set("second", new LiveObject({ a: 1 }));
      map.set("third", new LiveObject({ a: 2 }));
      assertSame(map.get("second")?.get("a"), 1);

      assertSame(map.delete("first"), true);
      assertSame(map.delete("unknown"), false);

      assertSame(map.has("first"), false);
      assertSame(map.has("second"), true);

      assertSame(map.size, 2);

      const entries = Array.from(map.entries());
      assertSame(entries.length, 2);
      assertSame(entries[0][0], "second");
      assertSame(entries[0][1].get("a"), 1);
      assertSame(entries[1][0], "third");
      assertSame(entries[1][1].get("a"), 2);

      const keys = Array.from(map.keys());
      assertEq(keys, ["second", "third"]);

      const values = Array.from(map.values());
      assertSame(values.length, 2);
      assertSame(values[0].get("a"), 1);
      assertSame(values[1].get("a"), 2);

      const asArray = Array.from(map);
      assertSame(asArray.length, 2);
      assertSame(asArray[0][0], "second");
      assertSame(asArray[0][1].get("a"), 1);
      assertSame(asArray[1][0], "third");
      assertSame(asArray[1][1].get("a"), 2);
    });

    test("basic operations with native objects", () => {
      const map = new LiveMap<string, { a: number }>([["first", { a: 0 }]]);
      assertEq(map.get("first"), { a: 0 });

      map.set("second", { a: 1 });
      map.set("third", { a: 2 });
      assertSame(map.get("second")?.a, 1);

      assertSame(map.delete("first"), true);
      assertSame(map.delete("unknown"), false);

      assertSame(map.has("first"), false);
      assertSame(map.has("second"), true);

      assertSame(map.size, 2);

      const entries = Array.from(map.entries());
      assertEq(entries, [
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ]);

      const keys = Array.from(map.keys());
      assertEq(keys, ["second", "third"]);

      const values = Array.from(map.values());
      assertEq(values, [{ a: 1 }, { a: 2 }]);

      const asArray = Array.from(map);
      assertEq(asArray, [
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ]);
    });
  });

  test("create document with map in root", async () => {
    const { storage, expectStorage } = await prepareStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
    ]);

    const root = storage.root;
    const map = root.toObject().map;
    assertEq(Array.from(map.entries()), []);
    expectStorage({ map: new Map() });
  });

  test("set throws on read-only", async () => {
    const { storage } = await prepareStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],
      1,
      [Permission.Read, Permission.PresenceWrite]
    );

    const map = storage.root.get("map");
    assertThrows(
      () => map.set("key", new LiveObject({ a: 0 })),
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("init map with items", async () => {
    const { storage, expectStorage } = await prepareStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
      createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
      createSerializedObject("0:3", { a: 1 }, "0:1", "second"),
      createSerializedObject("0:4", { a: 2 }, "0:1", "third"),
    ]);

    const root = storage.root;
    const map = root.get("map");

    assertEq(
      Object.fromEntries(
        Array.from(map.entries()).map((entry) => [
          entry[0],
          entry[1].toObject(),
        ])
      ),
      {
        first: { a: 0 },
        second: { a: 1 },
        third: { a: 2 },
      }
    );

    expectStorage({
      map: new Map([
        ["first", { a: 0 }],
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ]),
    });
  });

  test("map.set object", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, number>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

    const root = storage.root;
    const map = root.toObject().map;

    expectStorage({ map: new Map() });

    map.set("first", 0);
    expectStorage({
      map: new Map([["first", 0]]),
    });

    map.set("second", 1);
    expectStorage({
      map: new Map([
        ["first", 0],
        ["second", 1],
      ]),
    });

    map.set("third", 2);
    expectStorage({
      map: new Map([
        ["first", 0],
        ["second", 1],
        ["third", 2],
      ]),
    });

    assertUndoRedo();
  });

  describe("delete", () => {
    test("throws on read-only", async () => {
      const { storage } = await prepareStorageTest<{
        map: LiveMap<string, number>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1,
        [Permission.Read, Permission.PresenceWrite]
      );

      const map = storage.root.get("map");
      assertThrows(
        () => map.delete("key"),
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    test("should delete LiveObject", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          map: LiveMap<string, number>;
        }>([
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", 0),
          createSerializedRegister("0:3", "0:1", "second", 1),
          createSerializedRegister("0:4", "0:1", "third", 2),
        ]);

      const root = storage.root;
      const map = root.toObject().map;

      expectStorage({
        map: new Map([
          ["first", 0],
          ["second", 1],
          ["third", 2],
        ]),
      });

      map.delete("first");
      expectStorage({
        map: new Map([
          ["second", 1],
          ["third", 2],
        ]),
      });

      map.delete("second");
      expectStorage({
        map: new Map([["third", 2]]),
      });

      map.delete("third");
      expectStorage({
        map: new Map(),
      });

      assertUndoRedo();
    });

    test("should remove nested data structure from cache", async () => {
      const { room, storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          map: LiveMap<string, LiveObject<{ a: number }>>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedMap("0:1", "0:0", "map"),
            createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
          ],
          1
        );

      expectStorage({
        map: new Map([["first", { a: 0 }]]),
      });

      const root = storage.root;
      const map = root.toObject().map;

      assertSame(room[kInternal].nodeCount, 3);
      assertSame(map.delete("first"), true);
      assertSame(room[kInternal].nodeCount, 2);

      expectStorage({
        map: new Map(),
      });

      assertUndoRedo();
    });

    test("should delete live list", async () => {
      const { room, storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{ map: LiveMap<string, LiveList<number>> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedMap("0:1", "0:0", "map"),
            createSerializedList("0:2", "0:1", "first"),
            createSerializedRegister("0:3", "0:2", "!", 0),
          ],
          1
        );

      expectStorage({
        map: new Map([["first", [0]]]),
      });

      const root = storage.root;
      const map = root.toObject().map;

      assertSame(room[kInternal].nodeCount, 4);
      assertSame(map.delete("first"), true);
      assertSame(room[kInternal].nodeCount, 2);

      expectStorage({
        map: new Map(),
      });

      assertUndoRedo();
    });

    // https://github.com/liveblocks/liveblocks/issues/95
    test("should have deleted key when subscriber is called", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
          createSerializedRegister("0:3", "0:1", "second", "b"),
        ],
        1
      );

      const map = root.get("map");

      let keys: string[] = [];

      room.subscribe(map, () => (keys = Array.from(map.keys())));

      map.delete("first");

      assertEq(keys, ["second"]);
    });

    test("should call subscribe when key is deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
          createSerializedRegister("0:3", "0:1", "second", "b"),
        ],
        1
      );

      const map = root.get("map");

      const fn = vi.fn();

      room.subscribe(map, fn);

      map.delete("first");

      assertEq(fn.mock.calls.length, 1);
      assertSame(fn.mock.calls[0][0], map);
    });

    test("should not call subscribe when key is not deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
          createSerializedRegister("0:3", "0:1", "second", "b"),
        ],
        1
      );

      const map = root.get("map");

      const fn = vi.fn();

      room.subscribe(map, fn);

      map.delete("unknown");

      assertEq(fn.mock.calls.length, 0);
    });
  });

  test("map.set live object", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

    const root = storage.root;
    const map = root.toObject().map;
    expectStorage({
      map: new Map(),
    });

    map.set("first", new LiveObject({ a: 0 }));

    expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    assertUndoRedo();
  });

  test("map.set already attached live object should throw", async () => {
    const { storage } = await prepareStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
    ]);

    const root = storage.root;
    const map = root.toObject().map;

    const object = new LiveObject({ a: 0 });

    map.set("first", object);
    assertThrows(
      () => map.set("second", object),
      "Cannot attach node: already attached"
    );
  });

  test("new Map with already attached live object should throw", async () => {
    const { storage } = await prepareStorageTest<{
      child: LiveObject<{ a: number }> | null;
      map: LiveMap<string, LiveObject<{ a: number }>> | null;
    }>([createSerializedObject("0:0", { child: null, map: null })], 1);

    const root = storage.root;
    const child = new LiveObject({ a: 0 });
    root.update({ child });

    assertThrows(
      () => new LiveMap([["first", child]]),
      "Cannot set parent: node already has a parent"
    );
  });

  test("map.set live object on existing key", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
        ],
        1
      );

    expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    const root = storage.root;
    const map = root.toObject().map;

    map.set("first", new LiveObject({ a: 1 }));

    expectStorage({
      map: new Map([["first", { a: 1 }]]),
    });

    assertUndoRedo();
  });

  test("attach map with items to root", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

    expectStorage({});

    storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

    expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    assertUndoRedo();
  });

  test("attach map with live objects to root", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, LiveObject<{ a: number }>>;
      }>([createSerializedObject("0:0", {})], 1);

    expectStorage({});

    storage.root.set("map", new LiveMap([["first", new LiveObject({ a: 0 })]]));

    expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    assertUndoRedo();
  });

  test("attach map with objects to root", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

    expectStorage({});

    storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

    expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    assertUndoRedo();
  });

  test("add list in map", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveList<string>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

    expectStorage({ map: new Map() });

    const map = storage.root.get("map");
    map.set("list", new LiveList(["itemA", "itemB", "itemC"]));

    expectStorage({
      map: new Map([["list", ["itemA", "itemB", "itemC"]]]),
    });

    assertUndoRedo();
  });

  test("add map in map", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveMap<string, string>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

    expectStorage({ map: new Map() });

    const map = storage.root.get("map");
    map.set("map", new LiveMap([["first", "itemA"]]));

    expectStorage({
      map: new Map([["map", new Map([["first", "itemA"]])]]),
    });

    assertUndoRedo();
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { room, storage } = await prepareStorageTest<{
        map: LiveMap<string, string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      const liveMap = root.get("map");

      room.subscribe(liveMap, callback);

      liveMap.set("a", "av");

      assertEq(callback.mock.calls, [[literally(liveMap)]]);
    });

    test("deep subscribe", async () => {
      const { room, storage } = await prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedObject("0:2", { a: 0 }, "0:1", "mapElement"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;
      const mapElement = root.get("map").get("mapElement");

      const unsubscribe = room.subscribe(root.get("map"), callback, {
        isDeep: true,
      });

      mapElement?.set("a", 1);

      unsubscribe();

      mapElement?.set("a", 2);

      assertEq(callback.mock.calls, [
        // First call
        [
          // First argument is a list of changes
          [
            {
              type: "LiveObject",
              node: mapElement,
              updates: { a: { type: "update" } },
            },
          ],
        ],
      ]);
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    test("register added to map", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          map: LiveMap<string, string>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedMap("0:1", "0:0", "map"),
            createSerializedRegister("0:2", "0:1", "first", "a"),
          ],
          1
        );

      const rootDeepCallback = vi.fn();
      const mapCallback = vi.fn();

      const listItems = root.get("map");

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(listItems, mapCallback);

      expectStorage({ map: new Map([["first", "a"]]) });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.MAP, parentId: "0:0", parentKey: "map" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "first",
            data: "a",
          },
        ],
        [
          "2:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: "second",
            data: "b",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        map: new Map([
          ["first", "a"],
          ["second", "b"],
        ]),
      });

      assertEq(rootDeepCallback.mock.calls, [
        // First call
        [
          // First argument is a list of changes
          [
            {
              type: "LiveMap",
              node: listItems,
              updates: { second: { type: "update" } },
            },
          ],
        ],
      ]);

      assertEq(mapCallback.mock.calls.length, 1);
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedObject("0:2", { a: 1 }, "0:1", "el1"),
          createSerializedObject("0:3", { a: 2 }, "0:1", "el2"),
        ],
        1
      );

      const map = root.get("map");
      const secondItem = map.get("el2");

      const applyResult = map._detachChild(secondItem!);

      assertEq(applyResult, {
        modified: {
          node: map,
          type: "LiveMap",
          updates: { el2: { type: "delete", deletedItem: secondItem } },
        },
        reverse: [
          {
            data: { a: 2 },
            id: "0:3",
            opId: "1:0",
            parentId: "0:1",
            parentKey: "el2",
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });
  });
});
