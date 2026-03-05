/**
 * LiveMap tests that run against the real dev server.
 *
 * For edge cases that require precise control over wire-level ops (internal
 * methods), see LiveMap.mockserver.test.ts.
 */
import { describe, expect, test, vi } from "vitest";

import {
  prepareIsolatedStorageTest,
  prepareStorageTest,
  replaceStorageAndReconnectDevServer,
} from "../../__tests__/_devserver";
import { kInternal } from "../../internal";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";

describe("LiveMap", () => {
  describe("not attached", () => {
    test("basic operations with LiveObjects", () => {
      const map = new LiveMap([["first" as string, new LiveObject({ a: 0 })]]);
      expect(map.get("first")?.get("a")).toBe(0);

      map.set("second", new LiveObject({ a: 1 }));
      map.set("third", new LiveObject({ a: 2 }));
      expect(map.get("second")?.get("a")).toBe(1);

      expect(map.delete("first")).toBe(true);
      expect(map.delete("unknown")).toBe(false);

      expect(map.has("first")).toBe(false);
      expect(map.has("second")).toBe(true);

      expect(map.size).toBe(2);

      const entries = Array.from(map.entries());
      expect(entries.length).toBe(2);
      expect(entries[0][0]).toBe("second");
      expect(entries[0][1].get("a")).toBe(1);
      expect(entries[1][0]).toBe("third");
      expect(entries[1][1].get("a")).toBe(2);

      const keys = Array.from(map.keys());
      expect(keys).toEqual(["second", "third"]);

      const values = Array.from(map.values());
      expect(values.length).toBe(2);
      expect(values[0].get("a")).toBe(1);
      expect(values[1].get("a")).toBe(2);

      const asArray = Array.from(map);
      expect(asArray.length).toBe(2);
      expect(asArray[0][0]).toBe("second");
      expect(asArray[0][1].get("a")).toBe(1);
      expect(asArray[1][0]).toBe("third");
      expect(asArray[1][1].get("a")).toBe(2);
    });

    test("basic operations with native objects", () => {
      const map = new LiveMap<string, { a: number }>([["first", { a: 0 }]]);
      expect(map.get("first")).toEqual({ a: 0 });

      map.set("second", { a: 1 });
      map.set("third", { a: 2 });
      expect(map.get("second")?.a).toBe(1);

      expect(map.delete("first")).toBe(true);
      expect(map.delete("unknown")).toBe(false);

      expect(map.has("first")).toBe(false);
      expect(map.has("second")).toBe(true);

      expect(map.size).toBe(2);

      const entries = Array.from(map.entries());
      expect(entries).toEqual([
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ]);

      const keys = Array.from(map.keys());
      expect(keys).toEqual(["second", "third"]);

      const values = Array.from(map.values());
      expect(values).toEqual([{ a: 1 }, { a: 2 }]);

      const asArray = Array.from(map);
      expect(asArray).toEqual([
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ]);
    });
  });

  test("create document with map in root", async () => {
    const { root, expectStorage } = await prepareIsolatedStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>({
      liveblocksType: "LiveObject",
      data: { map: { liveblocksType: "LiveMap", data: {} } },
    });

    const map = root.get("map");
    expect(Array.from(map.entries())).toEqual([]);
    expectStorage({ map: new Map() });
  });

  // TODO: Needs read-only permission support in dev server
  // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
  test.skip("set throws on read-only", async () => {
    const { root } = await prepareIsolatedStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>(
      {
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      },
      { permissions: ["room:read", "room:presence:write"] }
    );

    const map = root.get("map");
    expect(() => map.set("key", new LiveObject({ a: 0 }))).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("init map with items", async () => {
    const { root, expectStorage } = await prepareIsolatedStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        map: {
          liveblocksType: "LiveMap",
          data: {
            first: { liveblocksType: "LiveObject", data: { a: 0 } },
            second: { liveblocksType: "LiveObject", data: { a: 1 } },
            third: { liveblocksType: "LiveObject", data: { a: 2 } },
          },
        },
      },
    });

    const map = root.get("map");

    expect(map.toImmutable()).toEqual(
      new Map([
        ["first", { a: 0 }],
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ])
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
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, number>;
      }>({
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      });

    const root = storageA.root;
    const map = root.get("map");

    await expectStorage({ map: new Map() });

    map.set("first", 0);
    await expectStorage({
      map: new Map([["first", 0]]),
    });

    map.set("second", 1);
    await expectStorage({
      map: new Map([
        ["first", 0],
        ["second", 1],
      ]),
    });

    map.set("third", 2);
    await expectStorage({
      map: new Map([
        ["first", 0],
        ["second", 1],
        ["third", 2],
      ]),
    });

    await assertUndoRedo();
  });

  describe("delete", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, number>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { map: { liveblocksType: "LiveMap", data: {} } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const map = root.get("map");
      expect(() => map.delete("key")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    test("should delete LiveObject", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          map: LiveMap<string, number>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            map: {
              liveblocksType: "LiveMap",
              data: { first: 0, second: 1, third: 2 },
            },
          },
        });

      const root = storageA.root;
      const map = root.get("map");

      await expectStorage({
        map: new Map([
          ["first", 0],
          ["second", 1],
          ["third", 2],
        ]),
      });

      map.delete("first");
      await expectStorage({
        map: new Map([
          ["second", 1],
          ["third", 2],
        ]),
      });

      map.delete("second");
      await expectStorage({
        map: new Map([["third", 2]]),
      });

      map.delete("third");
      await expectStorage({
        map: new Map(),
      });

      await assertUndoRedo();
    });

    test("should remove nested data structure from cache", async () => {
      const { roomA, storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          map: LiveMap<string, LiveObject<{ a: number }>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            map: {
              liveblocksType: "LiveMap",
              data: {
                first: { liveblocksType: "LiveObject", data: { a: 0 } },
              },
            },
          },
        });

      await expectStorage({
        map: new Map([["first", { a: 0 }]]),
      });

      const root = storageA.root;
      const map = root.get("map");

      expect(roomA[kInternal].nodeCount).toBe(3);
      expect(map.delete("first")).toBe(true);
      expect(roomA[kInternal].nodeCount).toBe(2);

      await expectStorage({
        map: new Map(),
      });

      await assertUndoRedo();
    });

    test("should delete live list", async () => {
      const { roomA, storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          map: LiveMap<string, LiveList<number>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            map: {
              liveblocksType: "LiveMap",
              data: {
                first: { liveblocksType: "LiveList", data: [0] },
              },
            },
          },
        });

      await expectStorage({
        map: new Map([["first", [0]]]),
      });

      const root = storageA.root;
      const map = root.get("map");

      expect(roomA[kInternal].nodeCount).toBe(4);
      expect(map.delete("first")).toBe(true);
      expect(roomA[kInternal].nodeCount).toBe(2);

      await expectStorage({
        map: new Map(),
      });

      await assertUndoRedo();
    });

    // https://github.com/liveblocks/liveblocks/issues/95
    test("should have deleted key when subscriber is called", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: { first: "a", second: "b" },
          },
        },
      });

      const map = root.get("map");

      let keys: string[] = [];

      room.subscribe(map, () => (keys = Array.from(map.keys())));

      map.delete("first");

      expect(keys).toEqual(["second"]);
    });

    test("should call subscribe when key is deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: { first: "a", second: "b" },
          },
        },
      });

      const map = root.get("map");

      const fn = vi.fn();

      room.subscribe(map, fn);

      map.delete("first");

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn.mock.calls[0][0]).toBe(map);
    });

    test("should not call subscribe when key is not deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: { first: "a", second: "b" },
          },
        },
      });

      const map = root.get("map");

      const fn = vi.fn();

      room.subscribe(map, fn);

      map.delete("unknown");

      expect(fn).toHaveBeenCalledTimes(0);
    });
  });

  test("map.set live object", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      });

    const root = storageA.root;
    const map = root.get("map");
    await expectStorage({
      map: new Map(),
    });

    map.set("first", new LiveObject({ a: 0 }));

    await expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    await assertUndoRedo();
  });

  test("map.set already attached live object should throw", async () => {
    const { root } = await prepareIsolatedStorageTest<{
      map: LiveMap<string, LiveObject<{ a: number }>>;
    }>({
      liveblocksType: "LiveObject",
      data: { map: { liveblocksType: "LiveMap", data: {} } },
    });

    const map = root.get("map");

    const object = new LiveObject({ a: 0 });

    map.set("first", object);
    expect(() => map.set("second", object)).toThrow();
  });

  test("new Map with already attached live object should throw", async () => {
    const { root } = await prepareIsolatedStorageTest<{
      child: LiveObject<{ a: number }> | null;
      map: LiveMap<string, LiveObject<{ a: number }>> | null;
    }>({
      liveblocksType: "LiveObject",
      data: { child: null, map: null },
    });

    const child = new LiveObject({ a: 0 });
    root.update({ child });

    expect(() => new LiveMap([["first", child]])).toThrow();
  });

  test("map.set live object on existing key", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: {
              first: { liveblocksType: "LiveObject", data: { a: 0 } },
            },
          },
        },
      });

    await expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    const root = storageA.root;
    const map = root.get("map");

    map.set("first", new LiveObject({ a: 1 }));

    await expectStorage({
      map: new Map([["first", { a: 1 }]]),
    });

    await assertUndoRedo();
  });

  test("attach map with items to root", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, { a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {},
      });

    await expectStorage({});

    storageA.root.set("map", new LiveMap([["first", { a: 0 }]]));

    await expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    await assertUndoRedo();
  });

  test("attach map with live objects to root", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: {},
      });

    await expectStorage({});

    storageA.root.set(
      "map",
      new LiveMap([["first", new LiveObject({ a: 0 })]])
    );

    await expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    await assertUndoRedo();
  });

  test("attach map with objects to root", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map?: LiveMap<string, { a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {},
      });

    await expectStorage({});

    storageA.root.set("map", new LiveMap([["first", { a: 0 }]]));

    await expectStorage({
      map: new Map([["first", { a: 0 }]]),
    });

    await assertUndoRedo();
  });

  test("add list in map", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveList<string>>;
      }>({
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      });

    await expectStorage({ map: new Map() });

    const map = storageA.root.get("map");
    map.set("list", new LiveList(["itemA", "itemB", "itemC"]));

    await expectStorage({
      map: new Map([["list", ["itemA", "itemB", "itemC"]]]),
    });

    await assertUndoRedo();
  });

  test("add map in map", async () => {
    const { storageA, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        map: LiveMap<string, LiveMap<string, string>>;
      }>({
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      });

    await expectStorage({ map: new Map() });

    const map = storageA.root.get("map");
    map.set("map", new LiveMap([["first", "itemA"]]));

    await expectStorage({
      map: new Map([["map", new Map([["first", "itemA"]])]]),
    });

    await assertUndoRedo();
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: { map: { liveblocksType: "LiveMap", data: {} } },
      });

      const callback = vi.fn();

      const liveMap = root.get("map");

      room.subscribe(liveMap, callback);

      liveMap.set("a", "av");

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveMap);
    });

    test("deep subscribe", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: {
              mapElement: { liveblocksType: "LiveObject", data: { a: 0 } },
            },
          },
        },
      });

      const callback = vi.fn();

      const mapElement = root.get("map").get("mapElement");

      const unsubscribe = room.subscribe(root.get("map"), callback, {
        isDeep: true,
      });

      mapElement?.set("a", 1);

      unsubscribe();

      mapElement?.set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: mapElement,
          updates: { a: { type: "update" } },
        },
      ]);
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    // TODO: Needs atomic storage replacement in dev server
    // See https://linear.app/liveblocks/issue/LB-3529/dev-server-needs-support-for-a-crash-replace-storage-atomic-feature
    test.skip("register added to map", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        map: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: { first: "a" },
          },
        },
      });

      const rootDeepCallback = vi.fn();
      const mapCallback = vi.fn();

      const map = root.get("map");

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(map, mapCallback);

      expectStorage({ map: new Map([["first", "a"]]) });

      await replaceStorageAndReconnectDevServer(room.id, {
        liveblocksType: "LiveObject",
        data: {
          map: {
            liveblocksType: "LiveMap",
            data: { first: "a", second: "b" },
          },
        },
      });

      await vi.waitUntil(() => root.toImmutable().map.has("second"));
      expectStorage({
        map: new Map([
          ["first", "a"],
          ["second", "b"],
        ]),
      });

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveMap",
          node: map,
          updates: { second: { type: "update" } },
        },
      ]);

      expect(mapCallback).toHaveBeenCalledTimes(1);
    });
  });
});
