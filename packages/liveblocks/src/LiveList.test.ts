import { LiveList } from "./LiveList";
import {
  assertStorage,
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIFTH_POSITION,
  FIRST_POSITION,
  FOURTH_POSITION,
  prepareStorageTest,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../test/utils";
import { LiveObject } from "./LiveObject";
import { LiveMap } from "./LiveMap";
import { Doc } from "./doc";
import { OpType } from "./live";

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

  describe("subscriptions", () => {
    test("simple action", () => {
      const { storage } = prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      storage.subscribe(liveList, callback);

      liveList.push("a");

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveList);
    });

    test("deep subscribe", () => {
      const { storage } = prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;
      const listElement = root.get("items").get(0);

      const unsubscribe = storage.subscribe(root.get("items"), callback, {
        isDeep: true,
      });

      listElement?.set("a", 1);

      unsubscribe();

      listElement?.set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        { type: "LiveObject", node: listElement },
      ]);
    });
  });
});
