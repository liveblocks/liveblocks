import { CrdtType, Op, OpType, SerializedCrdtWithId } from "./live";
import { Doc } from "./doc";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import { makePosition } from "./position";

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

function mapToJson<TKey extends string, TValue>(
  map: LiveMap<TKey, TValue>
): Array<[string, TValue]> {
  return Array.from(map.entries())
    .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
    .map((entry) => [entry[0], toJson(entry[1])]);
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

const FIRST_POSITION = makePosition();
const SECOND_POSITION = makePosition(FIRST_POSITION);
const THIRD_POSITION = makePosition(SECOND_POSITION);
const FOURTH_POSITION = makePosition(THIRD_POSITION);
const FIFTH_POSITION = makePosition(FOURTH_POSITION);

function assertStorage(storage: Doc, data: any) {
  const json = docToJson(storage);
  expect(json).toEqual(data);
}

function prepareStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const clonedItems = JSON.parse(JSON.stringify(items));
  const refDoc = Doc.load<T>(items, actor);
  const operations: Op[] = [];
  const doc = Doc.load<T>(clonedItems, actor, (ops) => {
    operations.push(...ops);
    refDoc.applyRemoteOperations(ops);
    doc.applyRemoteOperations(ops);
  });

  const states: any[] = [];

  function assert(data: any, shouldPushToStates = true) {
    if (shouldPushToStates) {
      states.push(data);
    }
    const json = docToJson(doc);
    expect(json).toEqual(data);
    expect(docToJson(refDoc)).toEqual(data);
    expect(doc.count()).toBe(refDoc.count());
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      doc.undo();
      assert(states[states.length - 2 - i], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      doc.redo();
      assert(states[i + 1], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      doc.undo();
      assert(states[states.length - 2 - i], false);
    }
  }

  return {
    operations,
    storage: doc,
    refStorage: refDoc,
    assert,
    assertUndoRedo,
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
  describe("subscribe live object", () => {
    test("simple action", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      const callback = jest.fn();

      const root = storage.root;

      storage.subscribe(root, callback);

      root.set("a", 1);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test("deep subscribe", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = storage.subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscribe generic", () => {
    test("simple action", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      const callback = jest.fn();

      const unsubscribe = storage.subscribe(callback);

      storage.root.set("a", 1);

      unsubscribe();

      storage.root.set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([storage.root]);
    });

    test("remote action", () => {
      const { storage } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      const callback = jest.fn();

      const unsubscribe = storage.subscribe(callback);

      storage.applyRemoteOperations([
        { type: OpType.UpdateObject, data: { a: 1 }, opId: "", id: "0:0" },
      ]);

      unsubscribe();

      storage.applyRemoteOperations([
        { type: OpType.UpdateObject, data: { a: 2 }, opId: "", id: "0:0" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([storage.root]);
    });

    test("batch actions on a single LiveObject", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        a: number;
        b: number;
      }>([createSerializedObject("0:0", { a: 0, b: 0 })], 1);

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = storage.subscribe(callback);

      storage.batch(() => {
        root.set("a", 1);
        root.set("b", 1);
      });

      unsubscribe();

      storage.batch(() => {
        root.set("a", 2);
        root.set("b", 2);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([storage.root]);

      assertUndoRedo();
    });

    test("batch actions on multiple LiveObjects", () => {
      const { storage } = prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>(
        [
          createSerializedObject("0:0", { a: 0 }),
          createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      storage.subscribe(callback);

      storage.batch(() => {
        root.set("a", 1);
        root.get("child").set("b", 1);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([storage.root, root.get("child")]);
    });
  });

  describe("batching", () => {
    it("batching and undo", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      storage.batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      assert({
        items: ["A", "B", "C"],
      });

      storage.undo();

      assert({
        items: [],
      });

      storage.redo();

      assert({
        items: ["A", "B", "C"],
      });
    });

    it("calling batch during a batch should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      storage.batch(() => {
        expect(() =>
          storage.batch(() => {
            storage.root.set("a", 0);
          })
        ).toThrow();
      });
    });

    it("calling undo during a batch should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      storage.batch(() => {
        expect(() => storage.undo()).toThrow();
      });
    });

    it("calling redo during a batch should throw", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      storage.batch(() => {
        expect(() => storage.redo()).toThrow();
      });
    });
  });

  describe("undo / redo", () => {
    it("list.push", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      assert({ items: [] });

      items.push("A");
      assert({
        items: ["A"],
      });

      items.push("B");
      assert({
        items: ["A", "B"],
      });

      assertUndoRedo();
    });

    it("max undo-redo stack", () => {
      const { storage, assert } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      for (let i = 0; i < 100; i++) {
        storage.root.set("a", i + 1);
        assert({
          a: i + 1,
        });
      }

      for (let i = 0; i < 100; i++) {
        storage.undo();
      }

      assert({
        a: 50,
      });
    });

    it("storage operation should clear redo stack", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      assert({ items: [] });

      items.insert("A", 0);
      assert({
        items: ["A"],
      });

      storage.undo();

      items.insert("B", 0);
      assert({
        items: ["B"],
      });

      storage.redo();

      assert({
        items: ["B"],
      });
    });
  });

  describe("LiveObject", () => {
    it("update non existing property", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest([
        createSerializedObject("0:0", {}),
      ]);

      assert({});

      storage.root.update({ a: 1 });
      assert({
        a: 1,
      });

      assertUndoRedo();
    });

    it("update non existing property with null", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest([
        createSerializedObject("0:0", {}),
      ]);

      assert({});

      storage.root.update({ a: null });
      assert({
        a: null,
      });

      assertUndoRedo();
    });

    it("update existing property", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest([
        createSerializedObject("0:0", { a: 0 }),
      ]);

      assert({ a: 0 });

      storage.root.update({ a: 1 });
      assert({
        a: 1,
      });

      assertUndoRedo();
    });

    it("update existing property with null", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest([
        createSerializedObject("0:0", { a: 0 }),
      ]);

      assert({ a: 0 });

      storage.root.update({ a: null });
      assert({
        a: null,
      });

      assertUndoRedo();
    });

    it("update root", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest([
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

      assertUndoRedo();
    });

    it("update with LiveObject", () => {
      const { storage, assert, operations, assertUndoRedo } =
        prepareStorageTest<{
          child: LiveObject<{ a: number }> | null;
        }>([createSerializedObject("0:0", { child: null })], 1);

      const root = storage.root;

      assert({
        child: null,
      });

      root.set("child", new LiveObject({ a: 0 }));

      assert({
        child: {
          a: 0,
        },
      });
      expect(storage.undoStack[0]).toEqual([
        {
          type: OpType.UpdateObject,
          id: "0:0",
          data: {
            child: null,
          },
        },
      ]);

      expect(operations.length).toEqual(1);
      expect(operations).toEqual([
        {
          type: OpType.CreateObject,
          id: "1:0",
          data: { a: 0 },
          parentId: "0:0",
          parentKey: "child",
        },
      ]);

      root.set("child", null);

      assert({
        child: null,
      });
      expect(storage.undoStack[1]).toEqual([
        {
          type: OpType.CreateObject,
          id: "1:0",
          data: { a: 0 },
          parentId: "0:0",
          parentKey: "child",
        },
      ]);

      assertUndoRedo();
    });

    it("remove nested child record with update", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("remove nested child record with update", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        a: number;
        child: LiveObject<{
          b: number;
          grandChild: LiveObject<{ c: number }>;
        }> | null;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
      ]);

      assert({
        a: 0,
        child: {
          b: 0,
        },
      });

      storage.root.update({ child: null });

      assert({
        a: 0,
        child: null,
      });
      expect(storage.count()).toBe(1);

      assertUndoRedo();
    });

    it("add nested record with update", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest(
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

      assertUndoRedo();
    });

    it("replace nested record with update", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest(
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

      assert({
        child: {
          a: 1,
        },
      });

      expect(storage.count()).toBe(2);

      assertUndoRedo();
    });

    it("update nested record", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("update deeply nested record", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("should ignore incoming updates if current op has not been acknowledged", () => {
      const storage = Doc.load<{ a: number }>(
        [createSerializedObject("0:0", { a: 0 })],
        1
      );

      expect(docToJson(storage)).toEqual({ a: 0 });

      storage.root.set("a", 1);

      expect(docToJson(storage)).toEqual({ a: 1 });

      storage.applyRemoteOperations([
        {
          type: OpType.UpdateObject,
          data: { a: 2 },
          id: "0:0",
          opId: "external",
        },
      ]);

      expect(docToJson(storage)).toEqual({ a: 1 });
    });
  });

  describe("LiveList", () => {
    describe("not attached", () => {
      it("basic operations with native objects", () => {
        const list = new LiveList<string>(["first", "second", "third"]);
        expect(list.get(0)).toEqual("first");
        expect(list.length).toBe(3);

        expect(list.toArray()).toEqual(["first", "second", "third"]);

        expect(Array.from(list)).toEqual(["first", "second", "third"]);

        expect(list.map((item) => item.toUpperCase())).toEqual([
          "FIRST",
          "SECOND",
          "THIRD",
        ]);

        expect(list.filter((item) => item.endsWith("d"))).toEqual([
          "second",
          "third",
        ]);

        expect(list.findIndex((item) => item.startsWith("s"))).toEqual(1);

        expect(list.some((item) => item.startsWith("x"))).toEqual(false);

        expect(list.indexOf("quatres")).toEqual(-1);
        expect(list.indexOf("third")).toEqual(2);

        list.delete(0);

        expect(list.toArray()).toEqual(["second", "third"]);
        expect(list.get(2)).toBe(undefined);
        expect(list.length).toBe(2);
      });
    });

    it("create document with list in root", () => {
      const { storage, assert } = prepareStorageTest<{
        items: LiveList<any>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ]);

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
        createSerializedObject("0:2", { a: 0 }, "0:1", FIRST_POSITION),
        createSerializedObject("0:3", { a: 1 }, "0:1", SECOND_POSITION),
        createSerializedObject("0:4", { a: 2 }, "0:1", THIRD_POSITION),
      ]);

      assert({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });
    });

    it("list.push record", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.get("items");

      assert({
        items: [],
      });

      items.push(new LiveObject({ a: 0 }));
      assert({
        items: [{ a: 0 }],
      });

      items.push(new LiveObject({ a: 1 }));
      assert({
        items: [{ a: 0 }, { a: 1 }],
      });

      items.push(new LiveObject({ a: 2 }));
      assert({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });

      assertUndoRedo();
    });

    it("list.delete first item", () => {
      let {
        storage: doc,
        assert,
        assertUndoRedo,
      } = prepareStorageTest<{
        items: LiveList<number>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedRegister("0:2", "0:1", FIRST_POSITION, 0),
        createSerializedRegister("0:3", "0:1", SECOND_POSITION, 1),
      ]);

      const root = doc.root;
      const items = root.toObject().items;

      assert({
        items: [0, 1],
      });

      items.delete(0);

      assert({
        items: [1],
      });

      assertUndoRedo();
    });

    it("list.push record then delete", () => {
      let {
        storage: doc,
        assert,
        assertUndoRedo,
      } = prepareStorageTest<{
        items: LiveList<LiveObject<{ b: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = doc.root.get("items");

      assert({
        items: [],
      });

      items.push(new LiveObject({ b: 0 }));

      assert({
        items: [{ b: 0 }],
      });

      items.delete(0);
      assert({
        items: [],
      });

      assertUndoRedo();
    });

    it("list.delete child record should remove descendants", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("list.insert at index 0", () => {
      let { storage, assert, assertUndoRedo } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      assert({
        items: [
          {
            a: 1,
          },
        ],
      });

      const root = storage.root;
      const items = root.toObject().items;

      items.insert(new LiveObject({ a: 0 }), 0);

      assert({
        items: [
          {
            a: 0,
          },
          {
            a: 1,
          },
        ],
      });

      assertUndoRedo();
    });

    it("list.move after current position", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 0 }, "0:1", FIRST_POSITION),
        createSerializedObject("0:3", { a: 1 }, "0:1", SECOND_POSITION),
        createSerializedObject("0:4", { a: 2 }, "0:1", THIRD_POSITION),
      ]);

      assert({
        items: [
          {
            a: 0,
          },
          {
            a: 1,
          },
          {
            a: 2,
          },
        ],
      });

      const root = storage.root;
      const items = root.toObject().items;
      items.move(0, 1);

      assert({
        items: [
          {
            a: 1,
          },
          {
            a: 0,
          },
          {
            a: 2,
          },
        ],
      });

      assertUndoRedo();
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

    it("list.push numbers", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assert({ items: [] });

      items.push(0);
      assert({ items: [0] });

      items.push(1);
      assert({ items: [0, 1] });

      items.push(2);

      assert({
        items: [0, 1, 2],
      });

      assertUndoRedo();
    });

    it("list.push LiveMap", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assert({ items: [] });

      items.push(new LiveMap<string, number>([["first", 0]]));

      assert({
        items: [[["first", 0]]],
      });

      assertUndoRedo();
    });

    it("list conflicts - move", () => {
      const storage = Doc.load<{ items: LiveList<string> }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      // Register id = 1:0
      items.push("A");
      // Register id = 1:1
      items.push("B");
      // Register id = 1:2
      items.push("C");

      assertStorage(storage, {
        items: ["A", "B", "C"],
      });

      items.move(0, 2);

      assertStorage(storage, {
        items: ["B", "C", "A"],
      });

      storage.applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assertStorage(storage, {
        items: ["C", "B", "A"],
      });

      storage.applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: FIFTH_POSITION,
        },
      ]);

      assertStorage(storage, {
        items: ["C", "B", "A"],
      });
    });

    it("list conflicts", () => {
      const storage = Doc.load<{ items: LiveList<string> }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      // Register id = 1:0
      items.push("0");

      storage.applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:1",
          parentId: "0:1",
          parentKey: "!",
          data: "1",
        },
      ]);

      assertStorage(storage, {
        items: ["1", "0"],
      });

      // Fix from backend
      storage.applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: '"',
        },
      ]);

      assertStorage(storage, {
        items: ["1", "0"],
      });
    });

    it("list conflicts 2", () => {
      const storage = Doc.load<{ items: LiveList<string> }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = storage.root.get("items");

      items.push("x0"); // Register id = 1:0
      items.push("x1"); // Register id = 1:1

      // Should go to pending
      storage.applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "y0",
        },
      ]);

      assertStorage(storage, {
        items: ["y0", "x0", "x1"],
      });

      // Should go to pending
      storage.applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:1",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "y1",
        },
      ]);

      assertStorage(storage, {
        items: ["y0", "x0", "y1", "x1"],
      });

      storage.applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: THIRD_POSITION,
        },
      ]);

      assertStorage(storage, {
        items: ["y0", "y1", "x0", "x1"],
      });

      storage.applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assertStorage(storage, {
        items: ["y0", "y1", "x0", "x1"],
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
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

    it("map.delete live object", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

    it("map.set live object", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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
      assert({
        map: [],
      });

      map.set("first", new LiveObject({ a: 0 }));

      assert({
        map: [["first", { a: 0 }]],
      });

      assertUndoRedo();
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
        child: LiveObject | null;
        map: LiveMap<string, LiveObject<{ a: number }>> | null;
      }>([createSerializedObject("0:0", { child: null, map: null })], 1);

      const root = storage.root;
      const child = new LiveObject({ a: 0 });
      root.update({ child });

      expect(() => new LiveMap([["first", child]])).toThrow();
    });

    it("map.set live object on existing key", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      map.set("first", new LiveObject({ a: 1 }));

      assert({
        map: [["first", { a: 1 }]],
      });

      assertUndoRedo();
    });

    it("map.delete existing live object", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("map.delete live list", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      assertUndoRedo();
    });

    it("attach map with items to root", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        map: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

      assert({});

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

      assertUndoRedo();
    });

    it("attach map with live objects to root", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        map: LiveMap<string, LiveObject<{ a: number }>>;
      }>([createSerializedObject("0:0", {})], 1);

      assert({});

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

      assertUndoRedo();
    });

    it("attach map with objects to root", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        map: LiveMap<string, { a: number }>;
      }>([createSerializedObject("0:0", {})], 1);

      assert({});

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

      assertUndoRedo();
    });

    it("add list in map", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        map: LiveMap<string, LiveList<string>>;
      }>(
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

    it("add map in map", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        map: LiveMap<string, LiveMap<string, string>>;
      }>(
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
