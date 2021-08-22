import { CrdtType, Op, OpType, SerializedCrdtWithId } from "./live";
import { Doc, LiveList, LiveMap, LiveObject } from "./doc";

function docToJson(doc: Doc<any>) {
  return recordToJson(doc.root);
}

function recordToJson(record: LiveObject) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson<T>(list: LiveList<T>): Array<T> {
  return list.toArray().map(toJson);
}

function mapToJson<TKey extends string, TValue>(map: LiveMap<TKey, TValue>): Array<[string, TValue]> {
  return Array.from(map.entries()).map((entry) => [entry[0], toJson(entry[1])]);
}

function toJson(value: any) {
  if (value instanceof LiveObject) {
    return recordToJson(value);
  } else if (value instanceof LiveList) {
    return listToJson(value);
  } else if (value instanceof LiveMap) {
    return mapToJson(value);
  }

  return value;
}

function prepareStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const clonedItems = JSON.parse(JSON.stringify(items));
  const refStorage = Doc.load<T>(items, actor);
  const storage = Doc.load<T>(clonedItems, actor, (ops) => {
    for (const op of ops) {
      refStorage.apply(op);
    }
  });

  function assert(data: any) {
    const json = docToJson(storage);
    expect(json).toEqual(data);
    expect(docToJson(refStorage)).toEqual(data);
    expect(storage.count()).toBe(refStorage.count());
  }

  return {
    storage,
    refStorage,
    assert,
  };
}

function createSerializedObject(
  id: string,
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Object,
      data,
      parentId,
      parentKey,
    },
  ];
}

function createSerializedList(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.List,
      parentId,
      parentKey,
    },
  ];
}

function createSerializedMap(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Map,
      parentId,
      parentKey,
    },
  ];
}

function createSerializedRegister(
  id: string,
  parentId: string,
  parentKey: string,
  data: any
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Register,
      parentId,
      parentKey,
      data,
    },
  ];
}

describe("Storage", () => {
  describe("LiveRecord", () => {
    it("update root", () => {
      const { storage, assert } = prepareStorageTest([
        createSerializedObject("0:0", { a: 0 }),
      ]);

      assert({
        a: 0,
      });

      storage.root.update({ a: 1 });
      assert({
        a: 1,
      });

      storage.root.update({ b: 1 });
      assert({
        a: 1,
        b: 1,
      });
    });

    it("remove child record with update", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
        child: LiveObject<{
          b: number;
          grandChild: LiveObject<{ c: number }>;
        }> | null;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
        createSerializedObject("0:2", { c: 0 }, "0:1", "grandChild"),
      ]);

      assert({
        a: 0,
        child: {
          b: 0,
          grandChild: {
            c: 0,
          },
        },
      });

      storage.root.update({ child: null });

      assert({
        a: 0,
        child: null,
      });
      expect(storage.count()).toBe(1);
    });

    it("update record with null prop", () => {
      const { storage: doc, assert } = prepareStorageTest([
        createSerializedObject("0:0", { a: 0 }),
      ]);

      assert({
        a: 0,
      });

      doc.root.update({ a: null });

      assert({
        a: null,
      });

      doc.root.update({ a: 0 });

      assert({
        a: 0,
      });
    });

    it("delete record key", () => {
      const { storage: doc, assert } = prepareStorageTest<{ a: number }>([
        createSerializedObject("0:0", { a: 0 }),
      ]);

      doc.root.delete("a");

      assert({});
    });

    it("add nested record with update", () => {
      const { storage, assert } = prepareStorageTest(
        [createSerializedObject("0:0", {})],
        1
      );

      assert({});

      storage.root.update({
        child: new LiveObject({ a: 0 }),
      });

      assert({
        child: {
          a: 0,
        },
      });

      expect(storage.count()).toBe(2);
    });

    it("replace nested record with update", () => {
      const { storage, assert } = prepareStorageTest(
        [createSerializedObject("0:0", {})],
        1
      );

      assert({});

      storage.root.update({
        child: new LiveObject({ a: 0 }),
      });

      assert({
        child: {
          a: 0,
        },
      });

      storage.root.update({
        child: new LiveObject({ a: 1 }),
      });

      expect(storage.count()).toBe(2);
    });

    it("update nested record", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
      ]);

      const root = storage.root;
      const child = root.toObject().child;

      assert({
        a: 0,
        child: {
          b: 0,
        },
      });

      child.update({ b: 1 });
      assert({
        a: 0,
        child: {
          b: 1,
        },
      });
    });

    it("update deeply nested record", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number; grandChild: LiveObject<{ c: number }> }>;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
        createSerializedObject("0:2", { c: 0 }, "0:1", "grandChild"),
      ]);

      assert({
        a: 0,
        child: {
          b: 0,
          grandChild: {
            c: 0,
          },
        },
      });

      const root = storage.root;
      const child = root.toObject().child;
      const grandChild = child.toObject().grandChild;
      expect(root.toObject()).toMatchObject({ a: 0 });
      expect(child.toObject()).toMatchObject({ b: 0 });
      expect(grandChild.toObject()).toMatchObject({ c: 0 });

      grandChild.update({ c: 1 });
      expect(grandChild.toObject()).toMatchObject({ c: 1 });

      assert({
        a: 0,
        child: {
          b: 0,
          grandChild: {
            c: 1,
          },
        },
      });
    });
  });

  describe("LiveList", () => {
    it("create document with list in root", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<any>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ]);

      const root = storage.root;
      expect(root.toObject().items.toArray()).toMatchObject([]);

      assert({
        items: [],
      });
    });

    it("init list with items", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 0 }, "0:1", "!"),
        createSerializedObject("0:3", { a: 1 }, "0:1", '"'),
        createSerializedObject("0:4", { a: 2 }, "0:1", "#"),
      ]);
      const root = storage.root;
      expect(
        root
          .toObject()
          .items.toArray()
          .map((r) => r.toObject())
      ).toMatchObject([{ a: 0 }, { a: 1 }, { a: 2 }]);

      assert({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });
    });

    it("list.push record", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;
      expect(items.toArray()).toMatchObject([]);

      assert({
        items: [],
      });

      items.push(new LiveObject({ a: 0 }));
      items.push(new LiveObject({ a: 1 }));
      items.push(new LiveObject({ a: 2 }));
      expect(items.toArray().map((r) => r.toObject())).toMatchObject([
        { a: 0 },
        { a: 1 },
        { a: 2 },
      ]);
      assert({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });
    });

    it("list.push record then delete", () => {
      let { storage: doc } = prepareStorageTest<{
        items: LiveList<LiveObject<{ b: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ]);

      const root = doc.root;
      const items = root.toObject().items;
      expect(items.toArray()).toMatchObject([]);

      items.push(new LiveObject({ b: 0 }));
      expect(items.toArray().map((r) => r.toObject())).toMatchObject([
        { b: 0 },
      ]);

      items.delete(0);
      expect(items.toArray()).toMatchObject([]);
    });

    it("list.delete child record should remove descendants", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<LiveObject<{ child: LiveObject<{ a: number }> }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", {}, "0:1", "!"),
        createSerializedObject("0:3", { a: 0 }, "0:2", "child"),
      ]);

      assert({
        items: [
          {
            child: {
              a: 0,
            },
          },
        ],
      });

      storage.root.toObject().items.delete(0);

      assert({
        items: [],
      });

      expect(storage.count()).toBe(2);
    });

    it("list.insert at index 0", () => {
      let { storage } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 1 }, "0:1", "!"),
      ]);

      const root = storage.root;
      const items = root.toObject().items;
      items.insert(new LiveObject({ a: 0 }), 0);

      expect(items.toArray().map((r) => r.toObject())).toMatchObject([
        { a: 0 },
        { a: 1 },
      ]);
    });

    it("list.move after current position", () => {
      const { storage } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 0 }, "0:1", "!"),
        createSerializedObject("0:3", { a: 1 }, "0:1", '"'),
        createSerializedObject("0:4", { a: 2 }, "0:1", "#"),
      ]);

      const root = storage.root;
      const items = root.toObject().items;
      items.move(0, 1);

      expect(items.toArray().map((r) => r.toObject())).toMatchObject([
        { a: 1 },
        { a: 0 },
        { a: 2 },
      ]);
    });

    it("list.push same record should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;
      expect(items.toArray()).toMatchObject([]);

      assert({
        items: [],
      });

      const record = new LiveObject({ a: 0 });

      items.push(record);
      expect(() => items.push(record)).toThrow();
    });

    it("list.push native object", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<number>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;

      items.push(0);
      items.push(1);
      items.push(2);

      expect(items.toArray()).toEqual([0, 1, 2]);
      assert({
        items: [0, 1, 2],
      });
    });

    it("list.push LiveMap", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<LiveMap<string, number>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.get("items");

      items.push(new LiveMap<string, number>([["first",0]]));

      const asArray = items.toArray().map(x => Array.from(x));

      expect(asArray).toEqual([[["first", 0]]]);
      assert({
        items: [[["first", 0]]],
      });
    });
  });

  describe("LiveMap", () => {
    describe("not attached", () => {
      it("basic operations with LiveObjects", () => {
        const map = new LiveMap<string, LiveObject>([
          ["first", new LiveObject({ a: 0 })],
        ]);
        expect(map.get("first")?.get("a")).toBe(0);

        map.set("second", new LiveObject({ a: 1 }));
        map.set("third", new LiveObject({ a: 2 }));
        expect(map.get("second")?.get("a")).toBe(1);

        expect(map.delete("first")).toBe(true);

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

    it("create document with map in root", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([
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

    it("init map with items", () => {
      const { storage, assert } = prepareStorageTest<{
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

      expect(
        Array.from(map.entries()).map((entry) => [
          entry[0],
          entry[1].toObject(),
        ])
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

    it("map.set object", () => {
      const { storage, assert } = prepareStorageTest<{
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

      map.set("first", 0);
      map.set("second", 1);
      map.set("third", 2);

      assert({
        map: [
          ["first", 0],
          ["second", 1],
          ["third", 2],
        ],
      });
    });

    it("map.delete live object", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
        createSerializedRegister("0:2", "0:1", "first", 0),
        createSerializedRegister("0:3", "0:1", "second", 1),
        createSerializedRegister("0:4", "0:1", "third", 2),
      ]);

      const root = storage.root;
      const map = root.toObject().map;

      map.delete("first");
      map.delete("second");
      map.delete("third");

      assert({
        map: [],
      });
    });

    it("map.set live object", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ]);

      const root = storage.root;
      const map = root.toObject().map;

      map.set("first", new LiveObject({ a: 0 }));

      assert({
        map: [["first", { a: 0 }]],
      });
    });

    it("map.set already attached live object should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ]);

      const root = storage.root;
      const map = root.toObject().map;

      const object = new LiveObject({ a: 0 });

      map.set("first", object);
      expect(() => map.set("second", object)).toThrow();
    });

    it("new Map with already attached live object should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        child: LiveObject | null,
        map: LiveMap<string, LiveObject<{ a: number }>> | null;
      }>([
        createSerializedObject("0:0", { child: null, map: null }),
      ], 1);

      const root = storage.root;
      const child = new LiveObject({ a: 0 });
      root.update({ child });

      const newMap = new LiveMap([["first", child]])
      expect(() => root.set("map", newMap)).toThrow();
    });

    it("map.set live object on existing key", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
        createSerializedObject("0:2", { a: 0 }, "0:1", "first"),
      ]);

      assert({
        map: [["first", { a: 0 }]],
      });

      const root = storage.root;
      const map = root.toObject().map;

      map.set("first", new LiveObject({ a: 1 }));

      assert({
        map: [["first", { a: 1 }]],
      });
    });

    it("map.delete existing live object", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>(
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

      expect(storage.count()).toBe(3);
      expect(map.delete("first")).toBe(true);
      expect(storage.count()).toBe(2);

      assert({
        map: [],
      });
    });

    it("map.delete live list", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveList<number>>;
      }>(
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

      expect(storage.count()).toBe(4);
      expect(map.delete("first")).toBe(true);
      expect(storage.count()).toBe(2);

      assert({
        map: [],
      });
    });

    it("attach map with items to root", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

      storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

      assert({
        map: [
          [
            "first",
            {
              a: 0,
            },
          ],
        ],
      });
    });

    it("attach map with live objects to root", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([createSerializedObject("0:0", {})], 1);

      storage.root.set(
        "map",
        new LiveMap([["first", new LiveObject({ a: 0 })]])
      );

      assert({
        map: [
          [
            "first",
            {
              a: 0,
            },
          ],
        ],
      });
    });

    it("attach map with objects to root", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

      storage.root.set("map", new LiveMap([["first", { a: 0 }]]));

      assert({
        map: [
          [
            "first",
            {
              a: 0,
            },
          ],
        ],
      });
    });

    it("add list in map", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveList<string>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],1 );

      const map = storage.root.get("map");
      map.set("list", new LiveList(["itemA", "itemB", "itemC"]));

      assert({
        map: [
          [
            "list",
            ["itemA", "itemB", "itemC"]
          ],
        ],
      });
    })

    it("add map in map", () => {
      const { storage, assert } = prepareStorageTest<{
        map: LiveMap<string, LiveMap<string, string>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedMap("0:1", "0:0", "map"),
      ],1 );

      const map = storage.root.get("map");
      map.set("map", new LiveMap([["first", "itemA"]]));

      assert({
        map: [
          [
            "map",
            [["first","itemA"]]
          ],
        ],
      });
    })
  });

  describe("from", () => {
    it("nested records", () => {
      const ops: Op[] = [];
      const doc = Doc.from(
        {
          a: 0,
          child: new LiveObject({ b: 0, grandChild: new LiveObject({ c: 0 }) }),
        },
        0,
        (newOps) => ops.push(...newOps)
      );

      expect(ops).toEqual([
        {
          type: OpType.CreateObject,
          id: "0:0",
          parentId: undefined,
          parentKey: undefined,
          data: {
            a: 0,
          },
        },
        {
          type: OpType.CreateObject,
          id: "0:1",
          parentId: "0:0",
          parentKey: "child",
          data: {
            b: 0,
          },
        },
        {
          type: OpType.CreateObject,
          id: "0:2",
          parentId: "0:1",
          parentKey: "grandChild",
          data: {
            c: 0,
          },
        },
      ]);
    });

    it("nested map", () => {
      const ops: Op[] = [];
      Doc.from(
        {
          map: new LiveMap(),
        },
        0,
        (newOps) => ops.push(...newOps)
      );

      expect(ops).toEqual([
        {
          type: OpType.CreateObject,
          id: "0:0",
          parentId: undefined,
          parentKey: undefined,
          data: {},
        },
        {
          type: OpType.CreateMap,
          id: "0:1",
          parentId: "0:0",
          parentKey: "map",
        },
      ]);
    });

    it("nested map with live object", () => {
      const ops: Op[] = [];
      Doc.from(
        {
          map: new LiveMap([["first", new LiveObject({ a: 0 })]]),
        },
        0,
        (newOps) => ops.push(...newOps)
      );

      expect(ops).toEqual([
        {
          type: OpType.CreateObject,
          id: "0:0",
          parentId: undefined,
          parentKey: undefined,
          data: {},
        },
        {
          type: OpType.CreateMap,
          id: "0:1",
          parentId: "0:0",
          parentKey: "map",
        },
        {
          type: OpType.CreateObject,
          id: "0:2",
          parentId: "0:1",
          parentKey: "first",
          data: {
            a: 0,
          },
        },
      ]);
    });
  });
});
