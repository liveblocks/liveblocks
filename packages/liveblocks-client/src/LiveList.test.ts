import { LiveList } from "./LiveList";
import {
  reconnect,
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIFTH_POSITION,
  FIRST_POSITION,
  FOURTH_POSITION,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../test/utils";
import { LiveObject } from "./LiveObject";
import { LiveMap } from "./LiveMap";
import {
  CrdtType,
  OpType,
  SerializedCrdtWithId,
  WebsocketCloseCodes,
} from "./live";

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

      expect(list.indexOf("quatre")).toEqual(-1);
      expect(list.indexOf("third")).toEqual(2);

      list.delete(0);

      expect(list.toArray()).toEqual(["second", "third"]);
      expect(list.get(2)).toBe(undefined);
      expect(list.length).toBe(2);

      list.clear();
      expect(list.toArray()).toEqual([]);
    });
  });

  it("create document with list in root", async () => {
    const { assert } = await prepareStorageTest<
      never,
      { items: LiveList<never> }
    >([
      createSerializedObject("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
    ]);

    assert({
      items: [],
    });
  });

  it("init list with items", async () => {
    const { assert } = await prepareStorageTest<
      never,
      { items: LiveList<LiveObject<{ a: number }>> }
    >([
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

  describe("push", () => {
    it("push LiveObject", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
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

    it("push existing LiveObject should throw", async () => {
      const { storage, assert } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
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

    it("push number", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<number> }
      >(
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

    it("push LiveMap", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveMap<string, number>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const root = storage.root;
      const items = root.get("items");

      assert({ items: [] });

      items.push(new LiveMap([["first", 0]]));

      assert({
        items: [{ first: 0 }],
      });

      assertUndoRedo();
    });
  });

  describe("insert", () => {
    it("insert LiveObject at position 0", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      assert({
        items: [{ a: 1 }],
      });

      const root = storage.root;
      const items = root.toObject().items;

      items.insert(new LiveObject({ a: 0 }), 0);

      assert({
        items: [{ a: 0 }, { a: 1 }],
      });

      assertUndoRedo();
    });
  });

  describe("delete", () => {
    it("delete first item", async () => {
      const {
        storage: doc,
        assert,
        assertUndoRedo,
      } = await prepareStorageTest<never, { items: LiveList<number> }>([
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

    it("delete child LiveObject should remove descendants", async () => {
      const { storage, assert, assertUndoRedo, getItemsCount } =
        await prepareStorageTest<
          never,
          { items: LiveList<LiveObject<{ child: LiveObject<{ a: number }> }>> }
        >([
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", {}, "0:1", "!"),
          createSerializedObject("0:3", { a: 0 }, "0:2", "child"),
        ]);

      assert({
        items: [{ child: { a: 0 } }],
      });

      storage.root.toObject().items.delete(0);

      assert({
        items: [],
      });

      expect(getItemsCount()).toBe(2);

      assertUndoRedo();
    });
  });

  describe("move", () => {
    it("list.move after current position", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 0 }, "0:1", FIRST_POSITION),
        createSerializedObject("0:3", { a: 1 }, "0:1", SECOND_POSITION),
        createSerializedObject("0:4", { a: 2 }, "0:1", THIRD_POSITION),
      ]);

      assert({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });

      const root = storage.root;
      const items = root.toObject().items;
      items.move(0, 1);

      assert({
        items: [{ a: 1 }, { a: 0 }, { a: 2 }],
      });

      assertUndoRedo();
    });
  });

  describe("clear", () => {
    it("should delete all items", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
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

      items.clear();
      assert({
        items: [],
      });

      assertUndoRedo();
    });
  });

  describe("set", () => {
    it("set register on detached list", () => {
      const list = new LiveList<string>(["A", "B", "C"]);
      list.set(0, "D");
      expect(list.toArray()).toEqual(["D", "B", "C"]);
    });

    it("set at invalid position should throw", () => {
      const list = new LiveList<string>(["A", "B", "C"]);
      expect(() => list.set(-1, "D")).toThrowError(
        `Cannot set list item at index "-1". index should be between 0 and 2`
      );
      expect(() => list.set(3, "D")).toThrowError(
        `Cannot set list item at index "3". index should be between 0 and 2`
      );
    });

    it("set register", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;

      assert({ items: ["A", "B", "C"] });

      items.set(0, "D");
      assert({ items: ["D", "B", "C"] });

      items.set(1, "E");
      assert({ items: ["D", "E", "C"] });

      assertUndoRedo();
    });

    it("set nested object", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;

      assert({ items: [{ a: 1 }] });

      items.set(0, new LiveObject({ a: 2 }));
      assert({ items: [{ a: 2 }] });

      assertUndoRedo();
    });
  });

  describe("apply CreateRegister", () => {
    it(`with intent "set" should replace existing item`, async () => {
      const { assert, applyRemoteOperations } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

      assert({
        items: ["A"],
      });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "0:2",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          intent: "set",
        },
      ]);

      assert({
        items: ["B"],
      });
    });

    it(`with intent "set" should notify with a "set" update`, async () => {
      const { root, applyRemoteOperations, subscribe } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

      const items = root.get("items");

      const callback = jest.fn();

      subscribe(items, callback, { isDeep: true });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "0:2",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          intent: "set",
        },
      ]);

      expect(callback).toHaveBeenCalledWith([
        {
          node: items,
          type: "LiveList",
          updates: [{ type: "set", index: 0, item: "B" }],
        },
      ]);
    });

    it(`with intent "set" should insert item if conflict with a delete operation`, async () => {
      const { root, assert, applyRemoteOperations } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

      const items = root.get("items");

      assert({
        items: ["A"],
      });

      items.delete(0);

      assert({
        items: [],
      });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "0:2",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          intent: "set",
        },
      ]);

      assert({
        items: ["B"],
      });
    });

    it(`with intent "set" should notify with a "insert" update if no item exists at this position`, async () => {
      const { root, applyRemoteOperations, subscribe } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
            createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
          ],
          1
        );

      const items = root.get("items");
      items.delete(0);

      const callback = jest.fn();

      subscribe(items, callback, { isDeep: true });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "0:2",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          intent: "set",
        },
      ]);

      expect(callback).toHaveBeenCalledWith([
        {
          node: items,
          type: "LiveList",
          updates: [{ type: "insert", index: 0, item: "B" }],
        },
      ]);
    });

    it("on existing position should give the right update", async () => {
      const { root, assert, applyRemoteOperations, subscribe } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("0");

      assert({
        items: ["0"],
      });

      const callback = jest.fn();

      subscribe(items, callback, { isDeep: true });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      assert({
        items: ["1", "0"],
      });

      expect(callback).toHaveBeenCalledWith([
        {
          node: items,
          type: "LiveList",
          updates: [{ type: "insert", index: 0, item: "1" }],
        },
      ]);
    });
  });

  describe("conflict", () => {
    it("list conflicts", async () => {
      const { root, assert, applyRemoteOperations } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("0");

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      assert({
        items: ["1", "0"],
      });

      // Fix from backend
      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      assert({
        items: ["1", "0"],
      });
    });

    it("list conflicts 2", async () => {
      const { root, applyRemoteOperations, assert } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("x0"); // Register id = 1:0
      items.push("x1"); // Register id = 1:1

      // Should go to pending
      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "y0",
        },
      ]);

      assert({
        items: ["y0", "x0", "x1"],
      });

      // Should go to pending
      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "2:1",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "y1",
        },
      ]);

      assert({
        items: ["y0", "x0", "y1", "x1"],
      });

      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: THIRD_POSITION,
        },
      ]);

      assert({
        items: ["y0", "y1", "x0", "x1"],
      });

      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assert({
        items: ["y0", "y1", "x0", "x1"],
      });
    });

    it("list conflicts with offline", async () => {
      const { root, assert, applyRemoteOperations, machine } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const items = root.get("items");

      // Register id = 1:0
      items.push("0");

      assert({
        items: ["0"],
      });

      reconnect(machine, 3, [
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedRegister("2:0", "0:1", FIRST_POSITION, "1"),
      ]);

      assert({
        items: ["1", "0"],
      });

      // Fix from backend
      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      assert({
        items: ["1", "0"],
      });
    });

    it("list conflicts with undo redo and remote change", async () => {
      const { root, assert, applyRemoteOperations, machine } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const items = root.get("items");

      items.push("0");

      assert({
        items: ["0"],
      });

      machine.undo();

      assert({
        items: [],
      });

      applyRemoteOperations([
        {
          type: OpType.CreateRegister,
          id: "1:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      machine.redo();

      assert({
        items: ["1", "0"],
      });
    });

    it("list conflicts - move", async () => {
      const { root, assert, applyRemoteOperations } =
        await prepareIsolatedStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = root.get("items");

      // Register id = 1:0
      items.push("A");
      // Register id = 1:1
      items.push("B");
      // Register id = 1:2
      items.push("C");

      assert({
        items: ["A", "B", "C"],
      });

      items.move(0, 2);

      assert({
        items: ["B", "C", "A"],
      });

      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assert({
        items: ["C", "B", "A"],
      });

      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:0",
          parentKey: FIFTH_POSITION,
        },
      ]);

      assert({
        items: ["C", "B", "A"],
      });
    });
  });

  it("list.push record then delete", async () => {
    const {
      storage: doc,
      assert,
      assertUndoRedo,
    } = await prepareStorageTest<
      never,
      { items: LiveList<LiveObject<{ b: number }>> }
    >(
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

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      subscribe(liveList, callback);

      liveList.push("a");

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveList);
    });

    test("deep subscribe", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
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

      const unsubscribe = subscribe(root.get("items"), callback, {
        isDeep: true,
      });

      listElement?.set("a", 1);

      unsubscribe();

      listElement?.set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: listElement,
          updates: { a: { type: "update" } },
        },
      ]);
    });

    test("remote move operation", async () => {
      const { storage, subscribe, applyRemoteOperations } =
        await prepareStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      // Register id = 1:0
      liveList.push("A");
      // Register id = 1:1
      liveList.push("B");
      // Register id = 1:2
      liveList.push("C");

      subscribe(liveList, callback);

      applyRemoteOperations([
        {
          type: OpType.SetParentKey,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveList);
    });

    test("remote delete item operation", async () => {
      const { storage, subscribe, applyRemoteOperations } =
        await prepareStorageTest<never, { items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      // Register id = 1:0
      liveList.push("A");

      subscribe(liveList, callback);

      applyRemoteOperations([
        {
          type: OpType.DeleteCrdt,
          id: "1:0",
        },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(liveList);
    });

    test("batch multiple actions", async () => {
      const { storage, subscribe, batch, assert } = await prepareStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      subscribe(liveList, callback, { isDeep: true });

      batch(() => {
        liveList.push("b");
        liveList.push("c");
      });

      assert({ items: ["a", "b", "c"] });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          node: liveList,
          type: "LiveList",
          updates: [
            { index: 1, item: "b", type: "insert" },
            { index: 2, item: "c", type: "insert" },
          ],
        },
      ]);
    });

    test("batch multiple inserts", async () => {
      const { storage, subscribe, batch, assert } = await prepareStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const liveList = root.get("items");

      subscribe(liveList, callback, { isDeep: true });

      batch(() => {
        liveList.insert("b", 1);
        liveList.insert("c", 2);
      });

      assert({ items: ["a", "b", "c"] });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test("clear with deep subscribe ", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
          createSerializedObject("0:3", { a: 2 }, "0:1", SECOND_POSITION),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = subscribe(root.get("items"), callback, {
        isDeep: true,
      });

      root.get("items").clear();

      unsubscribe();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: root.get("items"),
          updates: [
            { index: 0, type: "delete" },
            { index: 1, type: "delete" },
          ],
        },
      ]);
    });

    test("move with deep subscribe", async () => {
      const { storage, subscribe } = await prepareStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
          createSerializedObject("0:3", { a: 2 }, "0:1", SECOND_POSITION),
        ],
        1
      );

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = subscribe(root.get("items"), callback, {
        isDeep: true,
      });

      root.get("items").move(0, 1);

      unsubscribe();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: root.get("items"),
          updates: [
            {
              index: 1,
              previousIndex: 0,
              item: root.get("items").get(1),
              type: "move",
            },
          ],
        },
      ]);
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    test("Register added to list", async () => {
      const { assert, machine, root } = await prepareIsolatedStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
        ],
        1
      );

      const rootCallback = jest.fn();
      const rootDeepCallback = jest.fn();
      const listCallback = jest.fn();

      const listItems = root.get("items");

      machine.subscribe(root, rootCallback);
      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(listItems, listCallback);

      assert({ items: ["a"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
        [
          "2:0",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "b",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
        items: ["a", "b"],
      });

      listItems.push("c");

      assert({
        items: ["a", "b", "c"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(2);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 1, item: "b", type: "insert" }],
        },
      ]);
      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 2, item: "c", type: "insert" }],
        },
      ]);
      expect(listCallback).toHaveBeenCalledTimes(2);
    });

    test("Register moved in list", async () => {
      const { assert, machine, root } = await prepareIsolatedStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
        ],
        1
      );

      const rootCallback = jest.fn();
      const rootDeepCallback = jest.fn();
      const listCallback = jest.fn();

      const listItems = root.get("items");

      machine.subscribe(root, rootCallback);
      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(listItems, listCallback);

      assert({ items: ["a", "b"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "a",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "b",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
        items: ["b", "a"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 0, previousIndex: 1, item: "b", type: "move" }],
        },
      ]);

      expect(listCallback).toHaveBeenCalledTimes(1);
    });

    test("Register deleted from list", async () => {
      const { assert, machine, root } = await prepareIsolatedStorageTest<
        never,
        { items: LiveList<string> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
        ],
        1
      );

      const rootCallback = jest.fn();
      const rootDeepCallback = jest.fn();
      const listCallback = jest.fn();

      const listItems = root.get("items");

      machine.subscribe(root, rootCallback);
      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(listItems, listCallback);

      assert({ items: ["a", "b"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        ["0:1", { type: CrdtType.List, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.Register,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
        items: ["a"],
      });

      expect(rootCallback).toHaveBeenCalledTimes(0);

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveList",
          node: listItems,
          updates: [{ index: 1, type: "delete" }],
        },
      ]);

      expect(listCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<
        never,
        { items: LiveList<LiveObject<{ a: number }>> }
      >(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
          createSerializedObject("0:3", { a: 2 }, "0:1", SECOND_POSITION),
        ],
        1
      );

      const items = root.get("items");
      const secondItem = items.get(1);

      const applyResult = items._detachChild(secondItem!);

      expect(applyResult).toEqual({
        modified: {
          node: items,
          type: "LiveList",
          updates: [{ index: 1, type: "delete" }],
        },
        reverse: [
          {
            data: { a: 2 },
            id: "0:3",
            opId: "1:0",
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            type: OpType.CreateObject,
          },
        ],
      });
    });
  });
});
