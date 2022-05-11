import {
  prepareStorageTest,
  createSerializedObject,
  createSerializedMap,
  createSerializedRegister,
  createSerializedList,
  prepareIsolatedStorageTest,
  reconnect,
} from "../test/utils";
import { LiveMap } from "./LiveMap";
import { LiveList } from "./LiveList";
import { LiveObject } from "./LiveObject";
import {
  CrdtType,
  OpType,
  SerializedCrdtWithId,
  WebsocketCloseCodes,
} from "./live";

describe("LiveMap", () => {
  describe("not attached", () => {
    it("basic operations with LiveObjects", () => {
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

    it("basic operations with native objects", () => {
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

  it("create document with map in root", async () => {
    const { storage, assert } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
    ]);

    const root = storage.root;
    const map = root.toObject().map;
    expect(Array.from(map.entries())).toEqual([]);

    assert({
      map: [],
    });
  });

  it("init map with items", async () => {
    const { storage, assert } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
      createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
      createSerializedObject("0:3", { a: 1 }, "0:1", "second"),
      createSerializedObject("0:4", { a: 2 }, "0:1", "third"),
    ]);

    const root = storage.root;
    const map = root.get("map");

    expect(
      Array.from(map.entries()).map((entry) => [entry[0], entry[1].toObject()])
    ).toMatchObject([
      ["first", { a: 0 }],
      ["second", { a: 1 }],
      ["third", { a: 2 }],
    ]);

    assert({
      map: [
        ["first", { a: 0 }],
        ["second", { a: 1 }],
        ["third", { a: 2 }],
      ],
    });
  });

  it("map.set object", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, number> }
    >(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],
      1
    );

    const root = storage.root;
    const map = root.toObject().map;

    assert({ map: [] });

    map.set("first", 0);
    assert({
      map: [["first", 0]],
    });

    map.set("second", 1);
    assert({
      map: [
        ["first", 0],
        ["second", 1],
      ],
    });

    map.set("third", 2);
    assert({
      map: [
        ["first", 0],
        ["second", 1],
        ["third", 2],
      ],
    });

    assertUndoRedo();
  });

  describe("delete", () => {
    it("should delete LiveObject", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { map: LiveMap<string, LiveObject<{ a: number }>> }
      >([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
        createSerializedRegister("0:2", "0:1", "first", 0),
        createSerializedRegister("0:3", "0:1", "second", 1),
        createSerializedRegister("0:4", "0:1", "third", 2),
      ]);

      const root = storage.root;
      const map = root.toObject().map;

      assert({
        map: [
          ["first", 0],
          ["second", 1],
          ["third", 2],
        ],
      });

      map.delete("first");
      assert({
        map: [
          ["second", 1],
          ["third", 2],
        ],
      });

      map.delete("second");
      assert({
        map: [["third", 2]],
      });

      map.delete("third");
      assert({
        map: [],
      });

      assertUndoRedo();
    });

    it("should remove nested data structure from cache", async () => {
      const { storage, assert, assertUndoRedo, getItemsCount } =
        await prepareStorageTest<
          never,
          { map: LiveMap<string, LiveObject<{ a: number }>> }
        >(
          [
            createSerializedObject("0:0", {}),
            createSerializedMap("0:1", "0:0", "map"),
            createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
          ],
          1
        );

      assert({
        map: [["first", { a: 0 }]],
      });

      const root = storage.root;
      const map = root.toObject().map;

      expect(getItemsCount()).toBe(3);
      expect(map.delete("first")).toBe(true);
      expect(getItemsCount()).toBe(2);

      assert({
        map: [],
      });

      assertUndoRedo();
    });

    it("should delete live list", async () => {
      const { storage, assert, assertUndoRedo, getItemsCount } =
        await prepareStorageTest<
          never,
          { map: LiveMap<string, LiveList<number>> }
        >(
          [
            createSerializedObject("0:0", {}),
            createSerializedMap("0:1", "0:0", "map"),
            createSerializedList("0:2", "0:1", "first"),
            createSerializedRegister("0:3", "0:2", "!", 0),
          ],
          1
        );

      assert({
        map: [["first", [0]]],
      });

      const root = storage.root;
      const map = root.toObject().map;

      expect(getItemsCount()).toBe(4);
      expect(map.delete("first")).toBe(true);
      expect(getItemsCount()).toBe(2);

      assert({
        map: [],
      });

      assertUndoRedo();
    });

    // https://github.com/liveblocks/liveblocks/issues/95
    it("should have deleted key when subscriber is called", async () => {
      const { root, subscribe } = await prepareIsolatedStorageTest<
        never,
        { map: LiveMap<string, string> }
      >(
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

      subscribe(map, () => (keys = Array.from(map.keys())));

      map.delete("first");

      expect(keys).toEqual(["second"]);
    });

    it("should call subscribe when key is deleted", async () => {
      const { root, subscribe } = await prepareIsolatedStorageTest<
        never,
        { map: LiveMap<string, string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
          createSerializedRegister("0:3", "0:1", "second", "b"),
        ],
        1
      );

      const map = root.get("map");

      const fn = jest.fn();

      subscribe(map, fn);

      map.delete("first");

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn.mock.calls[0][0]).toBe(map);
    });

    it("should not call subscribe when key is not deleted", async () => {
      const { root, subscribe } = await prepareIsolatedStorageTest<
        never,
        { map: LiveMap<string, string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
          createSerializedRegister("0:3", "0:1", "second", "b"),
        ],
        1
      );

      const map = root.get("map");

      const fn = jest.fn();

      subscribe(map, fn);

      map.delete("unknown");

      expect(fn).toHaveBeenCalledTimes(0);
    });
  });

  it("map.set live object", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],
      1
    );

    const root = storage.root;
    const map = root.toObject().map;
    assert({
      map: [],
    });

    map.set("first", new LiveObject({ a: 0 }));

    assert({
      map: [["first", { a: 0 }]],
    });

    assertUndoRedo();
  });

  it("map.set already attached live object should throw", async () => {
    const { storage } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >([
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "map"),
    ]);

    const root = storage.root;
    const map = root.toObject().map;

    const object = new LiveObject({ a: 0 });

    map.set("first", object);
    expect(() => map.set("second", object)).toThrow();
  });

  it("new Map with already attached live object should throw", async () => {
    const { storage } = await prepareStorageTest<
      never,
      {
        child: LiveObject<{ a: number }> | null;
        map: LiveMap<string, LiveObject<{ a: number }>> | null;
      }
    >([createSerializedObject("0:0", { child: null, map: null })], 1);

    const root = storage.root;
    const child = new LiveObject({ a: 0 });
    root.update({ child });

    expect(() => new LiveMap([["first", child]])).toThrow();
  });

  it("map.set live object on existing key", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
        createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
      ],
      1
    );

    assert({
      map: [["first", { a: 0 }]],
    });

    const root = storage.root;
    const map = root.toObject().map;

    map.set("first", new LiveObject({ a: 1 }));

    assert({
      map: [["first", { a: 1 }]],
    });

    assertUndoRedo();
  });

  it("attach map with items to root", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, { a: number }> }
    >([createSerializedObject("0:0", {})], 1);

    assert({});

    storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

    assert({
      map: [["first", { a: 0 }]],
    });

    assertUndoRedo();
  });

  it("attach map with live objects to root", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveObject<{ a: number }>> }
    >([createSerializedObject("0:0", {})], 1);

    assert({});

    storage.root.set("map", new LiveMap([["first", new LiveObject({ a: 0 })]]));

    assert({
      map: [["first", { a: 0 }]],
    });

    assertUndoRedo();
  });

  it("attach map with objects to root", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, { a: number }> }
    >([createSerializedObject("0:0", {})], 1);

    assert({});

    storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

    assert({
      map: [["first", { a: 0 }]],
    });

    assertUndoRedo();
  });

  it("add list in map", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveList<string>> }
    >(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],
      1
    );

    assert({ map: [] });

    const map = storage.root.get("map");
    map.set("list", new LiveList(["itemA", "itemB", "itemC"]));

    assert({
      map: [["list", ["itemA", "itemB", "itemC"]]],
    });

    assertUndoRedo();
  });

  it("add map in map", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<
      never,
      { map: LiveMap<string, LiveMap<string, string>> }
    >(
      [
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],
      1
    );

    assert({ map: [] });

    const map = storage.root.get("map");
    map.set("map", new LiveMap([["first", "itemA"]]));

    assert({
      map: [["map", [["first", "itemA"]]]],
    });

    assertUndoRedo();
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { map: LiveMap<string, string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const liveMap = root.get("map");

      subscribe(liveMap, callback);

      liveMap.set("a", "av");

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveMap);
    });

    test("deep subscribe", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { map: LiveMap<string, LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedObject("0:2", { a: 0 }, "0:1", "mapElement"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;
      const mapElement = root.get("map").get("mapElement");

      const unsubscribe = subscribe(root.get("map"), callback, {
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
    test("Register added to map", async () => {
      const { assert, machine, root } = await prepareIsolatedStorageTest<
        never,
        { map: LiveMap<string, string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedMap("0:1", "0:0", "map"),
          createSerializedRegister("0:2", "0:1", "first", "a"),
        ],
        1
      );

      const rootDeepCallback = jest.fn();
      const mapCallback = jest.fn();

      const listItems = root.get("map");

      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(listItems, mapCallback);

      assert({
        map: [["first", "a"]],
      });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["0:1", { type: CrdtType.Map, parentId: "0:0", parentKey: "map" }],
        [
          "0:2",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: "first",
            data: "a",
          },
        ],
        [
          "2:0",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: "second",
            data: "b",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
        map: [
          ["first", "a"],
          ["second", "b"],
        ],
      });

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveMap",
          node: listItems,
          updates: { second: { type: "update" } },
        },
      ]);

      expect(mapCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<
        never,
        { map: LiveMap<string, LiveObject<{ a: number }>> }
      >(
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

      expect(applyResult).toEqual({
        modified: {
          node: map,
          type: "LiveMap",
          updates: { el2: { type: "delete" } },
        },
        reverse: [
          {
            data: { a: 2 },
            id: "0:3",
            opId: "1:0",
            parentId: "0:1",
            parentKey: "el2",
            type: OpType.CreateObject,
          },
        ],
      });
    });
  });
});
