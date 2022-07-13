import {
  listUpdate,
  listUpdateDelete,
  listUpdateInsert,
  listUpdateMove,
} from "../test/updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  createSerializedRegister,
  FIFTH_POSITION,
  FIRST_POSITION,
  FOURTH_POSITION,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  prepareStorageUpdateTest,
  reconnect,
  SECOND_POSITION,
  THIRD_POSITION,
} from "../test/utils";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import type { IdTuple, SerializedCrdt } from "./types";
import { CrdtType, OpCode, WebsocketCloseCodes } from "./types";

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

  describe("deserialization", () => {
    it("create document with list in root", async () => {
      const { assertImmutable } = await prepareIsolatedStorageTest<{
        items: LiveList<never>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ]);

      assertImmutable({
        items: [],
      });
    });

    it("init list with items", async () => {
      const { assertImmutable } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", { a: 0 }, "0:1", FIRST_POSITION),
        createSerializedObject("0:3", { a: 1 }, "0:1", SECOND_POSITION),
        createSerializedObject("0:4", { a: 2 }, "0:1", THIRD_POSITION),
      ]);

      assertImmutable({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });
    });
  });

  describe("push", () => {
    describe("updates", () => {
      it(
        "push on empty list update",
        prepareStorageUpdateTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          async ({ root, assert, machine }) => {
            root.get("items").push("a");
            machine.undo();
            machine.redo();

            assert([
              [listUpdate(["a"], [listUpdateInsert(0, "a")])],
              [listUpdate([], [listUpdateDelete(0)])],
              [listUpdate(["a"], [listUpdateInsert(0, "a")])],
            ]);
          }
        )
      );
    });

    it("push LiveObject on empty list", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
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

      assertImmutable({
        items: [],
      });

      items.push(new LiveObject({ a: 0 }));

      assertImmutable({
        items: [{ a: 0 }],
      });

      assertImmutableUndoRedo();
    });

    it("push number on empty list", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
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

      assertImmutable({ items: [] });

      items.push(0);
      assertImmutable({ items: [0] });

      assertImmutableUndoRedo();
    });

    it("push LiveMap on empty list", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
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

      assertImmutable({ items: [] });

      items.push(new LiveMap([["first", 0]]));

      assertImmutable({ items: [new Map([["first", 0]])] });

      assertImmutableUndoRedo();
    });

    it("push already attached LiveObject should throw", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
        ],
        1
      );

      const items = root.toObject().items;

      const object = new LiveObject({ a: 0 });

      items.push(object);
      expect(() => items.push(object)).toThrow();
    });
  });

  describe("insert", () => {
    describe("updates", () => {
      it(
        "insert at the middle update",
        prepareStorageUpdateTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "C"),
          ],
          async ({ root, assert, machine }) => {
            root.get("items").insert("B", 1);
            machine.undo();
            machine.redo();

            assert([
              [listUpdate(["A", "B", "C"], [listUpdateInsert(1, "B")])],
              [listUpdate(["A", "C"], [listUpdateDelete(1)])],
              [listUpdate(["A", "B", "C"], [listUpdateInsert(1, "B")])],
            ]);
          }
        )
      );
    });

    it("insert LiveObject at position 0", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveObject<{ a: number }>>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
          ],
          1
        );

      assertImmutable({
        items: [{ a: 1 }],
      });

      const root = storage.root;
      const items = root.toObject().items;

      items.insert(new LiveObject({ a: 0 }), 0);

      assertImmutable({ items: [{ a: 0 }, { a: 1 }] });

      assertImmutableUndoRedo();
    });
  });

  describe("delete", () => {
    describe("updates", () => {
      it(
        "delete first update",
        prepareStorageUpdateTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          ],
          async ({ root, assert, machine }) => {
            root.get("items").delete(0);
            machine.undo();
            machine.redo();

            assert([
              [listUpdate([], [listUpdateDelete(0)])],
              [listUpdate(["A"], [listUpdateInsert(0, "A")])],
              [listUpdate([], [listUpdateDelete(0)])],
            ]);
          }
        )
      );
    });

    it("delete first item", async () => {
      const {
        storage: doc,
        assertImmutable,
        assertImmutableUndoRedo,
      } = await prepareStorageTest<{ items: LiveList<string> }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
        createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
      ]);

      const root = doc.root;
      const items = root.toObject().items;

      assertImmutable({
        items: ["A", "B"],
      });

      items.delete(0);

      assertImmutable({
        items: ["B"],
      });

      assertImmutableUndoRedo();
    });

    it("delete should remove descendants", async () => {
      const {
        storage,
        assertImmutable,
        assertImmutableUndoRedo,
        getItemsCount,
      } = await prepareStorageTest<{
        items: LiveList<LiveObject<{ child: LiveObject<{ a: number }> }>>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedObject("0:2", {}, "0:1", "!"),
        createSerializedObject("0:3", { a: 0 }, "0:2", "child"),
      ]);

      assertImmutable({
        items: [{ child: { a: 0 } }],
      });

      storage.root.toObject().items.delete(0);

      assertImmutable({
        items: [],
      });

      // Ensure that LiveStructure are deleted properly
      expect(getItemsCount()).toBe(2);

      assertImmutableUndoRedo();
    });
  });

  describe("move", () => {
    describe("updates", () => {
      it(
        "move at the end update",
        prepareStorageUpdateTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          ],
          async ({ root, assert, machine }) => {
            root.get("items").move(0, 1);
            machine.undo();
            machine.redo();

            assert([
              [listUpdate(["B", "A"], [listUpdateMove(0, 1, "A")])],
              [listUpdate(["A", "B"], [listUpdateMove(1, 0, "A")])],
              [listUpdate(["B", "A"], [listUpdateMove(0, 1, "A")])],
            ]);
          }
        )
      );
    });

    it("move after current position", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>([
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
        ]);

      assertImmutable({
        items: ["A", "B", "C"],
      });

      const root = storage.root;
      const items = root.toObject().items;
      items.move(0, 1);

      assertImmutable({ items: ["B", "A", "C"] });

      assertImmutableUndoRedo();
    });

    it("move before current position", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
            createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
          ],
          1
        );

      assertImmutable({
        items: ["A", "B", "C"],
      });

      const items = storage.root.get("items");

      items.move(0, 1);
      assertImmutable({
        items: ["B", "A", "C"],
      });

      assertImmutableUndoRedo();
    });

    it("move at the end of the list", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>([
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
          createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          createSerializedRegister("0:4", "0:1", THIRD_POSITION, "C"),
        ]);

      assertImmutable({
        items: ["A", "B", "C"],
      });

      const root = storage.root;
      const items = root.toObject().items;
      items.move(0, 2);

      assertImmutable({
        items: ["B", "C", "A"],
      });

      assertImmutableUndoRedo();
    });
  });

  describe("clear", () => {
    describe("updates", () => {
      it(
        "clear updates",
        prepareStorageUpdateTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
            createSerializedRegister("0:2", "0:1", FIRST_POSITION, "A"),
            createSerializedRegister("0:3", "0:1", SECOND_POSITION, "B"),
          ],
          async ({ root, assert, machine }) => {
            root.get("items").clear();
            machine.undo();
            machine.redo();

            assert([
              [listUpdate([], [listUpdateDelete(0), listUpdateDelete(0)])],
              [
                listUpdate(
                  ["A", "B"],
                  [listUpdateInsert(0, "A"), listUpdateInsert(1, "B")]
                ),
              ],
              // Because redo reverse the operations, we delete items from the end
              [listUpdate([], [listUpdateDelete(1), listUpdateDelete(0)])],
            ]);
          }
        )
      );
    });

    it("clear should delete all items", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
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
      const items = root.get("items");

      assertImmutable({
        items: ["A", "B", "C"],
      });

      items.clear();
      assertImmutable({
        items: [],
      });

      assertImmutableUndoRedo();
    });
  });

  describe("batch", () => {
    it("batch multiple inserts", async () => {
      const { storage, assertImmutable, assertImmutableUndoRedo, batch } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedObject("0:0", {}),
            createSerializedList("0:1", "0:0", "items"),
          ],
          1
        );

      const items = storage.root.get("items");

      assertImmutable({ items: [] });

      batch(() => {
        items.push("A");
        items.push("B");
      });

      assertImmutable(
        { items: ["A", "B"] }
        // Updates are not tested here because undo/redo is not symetric
      );

      assertImmutableUndoRedo();
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
        'Cannot set list item at index "-1". index should be between 0 and 2'
      );
      expect(() => list.set(3, "D")).toThrowError(
        'Cannot set list item at index "3". index should be between 0 and 2'
      );
    });

    it("set register", async () => {
      const {
        storage,

        // XXX The goal is to replace these calls with the assertImmutable* equivalents
        // This should be trivial, but the test starts failing once I do
        assertJson,
        assertJsonUndoRedo,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
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

      assertJson({ items: ["A", "B", "C"] });

      items.set(0, "D");
      assertJson({ items: ["D", "B", "C"] });

      items.set(1, "E");
      assertJson({ items: ["D", "E", "C"] });

      assertJsonUndoRedo();
    });

    it("set nested object", async () => {
      const {
        storage,

        // XXX The goal is to replace these calls with the assertImmutable* equivalents
        // This should be trivial, but the test starts failing once I do
        assertJson,
        assertJsonUndoRedo,
      } = await prepareStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
        [
          createSerializedObject("0:0", {}),
          createSerializedList("0:1", "0:0", "items"),
          createSerializedObject("0:2", { a: 1 }, "0:1", FIRST_POSITION),
        ],
        1
      );

      const root = storage.root;
      const items = root.toObject().items;

      assertJson({ items: [{ a: 1 }] });

      items.set(0, new LiveObject({ a: 2 }));
      assertJson({ items: [{ a: 2 }] });

      assertJsonUndoRedo();
    });
  });

  describe("conflict", () => {
    it("list conflicts", async () => {
      const { root, assertImmutable, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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
          type: OpCode.CREATE_REGISTER,
          id: "2:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      assertImmutable({
        items: ["1", "0"],
      });

      // Fix from backend
      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      assertImmutable({
        items: ["1", "0"],
      });
    });

    it("list conflicts 2", async () => {
      const { root, applyRemoteOperations, assertImmutable } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "y0",
        },
      ]);

      assertImmutable({
        items: ["y0", "x0", "x1"],
      });

      // Should go to pending
      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:1",
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "y1",
        },
      ]);

      assertImmutable({
        items: ["y0", "x0", "y1", "x1"],
      });

      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: THIRD_POSITION,
        },
      ]);

      assertImmutable({
        items: ["y0", "y1", "x0", "x1"],
      });

      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assertImmutable({
        items: ["y0", "y1", "x0", "x1"],
      });
    });

    it("list conflicts with offline", async () => {
      const { root, assertImmutable, applyRemoteOperations, machine } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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

      assertImmutable({
        items: ["0"],
      });

      reconnect(machine, 3, [
        createSerializedObject("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
        createSerializedRegister("2:0", "0:1", FIRST_POSITION, "1"),
      ]);

      assertImmutable({
        items: ["1", "0"],
      });

      // Fix from backend
      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: SECOND_POSITION,
        },
      ]);

      assertImmutable({
        items: ["1", "0"],
      });
    });

    it("list conflicts with undo redo and remote change", async () => {
      const { root, assertImmutable, applyRemoteOperations, machine } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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

      assertImmutable({
        items: ["0"],
      });

      machine.undo();

      assertImmutable({
        items: [],
      });

      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:1",
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "1",
        },
      ]);

      machine.redo();

      assertImmutable({
        items: ["1", "0"],
      });
    });

    it("list conflicts - move", async () => {
      const { root, assertImmutable, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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

      assertImmutable({
        items: ["A", "B", "C"],
      });

      items.move(0, 2);

      assertImmutable({
        items: ["B", "C", "A"],
      });

      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:1",
          parentKey: FOURTH_POSITION,
        },
      ]);

      assertImmutable({
        items: ["C", "B", "A"],
      });

      applyRemoteOperations([
        {
          type: OpCode.SET_PARENT_KEY,
          id: "1:0",
          parentKey: FIFTH_POSITION,
        },
      ]);

      assertImmutable({
        items: ["C", "B", "A"],
      });
    });

    it("list conflicts - ack has different position that local item", async () => {
      const { root, assertImmutable, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("B");

      assertImmutable({
        items: ["B"],
      });

      // Other client created "A" at the same time but was processed first by the server.
      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "A",
          opId: "2:1",
        },
      ]);
      // B is shifted to SECOND_POSITION

      // Other client deleted "A" right after creation.
      applyRemoteOperations([
        {
          type: OpCode.DELETE_CRDT,
          id: "2:0",
          opId: "2:2",
        },
      ]);

      assertImmutable({
        items: ["B"], // "B" is at SECOND_POSITION
      });

      // Server sends ackownledgment for "B" creation with different position/
      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          opId: "1:0",
        },
      ]);

      assertImmutable({
        items: ["B"], // "B" should at FIRST_POSITION
      });

      // Other client creates an item at the SECOND_POSITION
      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: SECOND_POSITION,
          data: "C",
          opId: "2:3",
        },
      ]);

      assertImmutable({
        items: ["B", "C"],
      });
    });

    it("list conflicts - ack has different position that local and ack position is used", async () => {
      const { root, assertImmutable, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
          [
            createSerializedObject("root", {}),
            createSerializedList("0:0", "root", "items"),
          ],
          1
        );

      const items = root.get("items");

      items.push("B");

      assertImmutable({
        items: ["B"],
      });

      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "2:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "A",
          opId: "2:1",
        },
      ]);

      applyRemoteOperations([
        {
          type: OpCode.DELETE_CRDT,
          id: "2:0",
          opId: "2:2",
        },
      ]);

      items.insert("C", 0); // Insert at FIRST_POSITION

      // Ack
      applyRemoteOperations([
        {
          type: OpCode.CREATE_REGISTER,
          id: "1:0",
          parentId: "0:0",
          parentKey: FIRST_POSITION,
          data: "B",
          opId: "1:0",
        },
      ]);

      assertImmutable({
        items: ["B", "C"], // C position is shifted
      });
    });
  });

  describe("subscriptions", () => {
    test("batch multiple actions", async () => {
      const { storage, subscribe, batch, assertImmutable } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
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

      assertImmutable({ items: ["a", "b", "c"] });

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
      const { storage, subscribe, batch, assertImmutable } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
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

      assertImmutable({ items: ["a", "b", "c"] });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    test("Register added to list", async () => {
      const { assertImmutable, machine, root } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
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

      assertImmutable({ items: ["a"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
        [
          "2:0",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "b",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assertImmutable({
        items: ["a", "b"],
      });

      listItems.push("c");

      assertImmutable({
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
      const { assertImmutable, machine, root } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
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

      assertImmutable({ items: ["a", "b"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: SECOND_POSITION,
            data: "a",
          },
        ],
        [
          "0:3",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "b",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assertImmutable({
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
      const { assertImmutable, machine, root } =
        await prepareIsolatedStorageTest<{
          items: LiveList<string>;
        }>(
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

      assertImmutable({ items: ["a", "b"] });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        ["0:1", { type: CrdtType.LIST, parentId: "0:0", parentKey: "items" }],
        [
          "0:2",
          {
            type: CrdtType.REGISTER,
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "a",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assertImmutable({
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
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>(
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
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });

    describe("apply CreateRegister", () => {
      it('with intent "set" should replace existing item', async () => {
        const { assertImmutable, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedObject("root", {}),
              createSerializedList("0:0", "root", "items"),
              createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
            ],
            1
          );

        assertImmutable({
          items: ["A"],
        });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        assertImmutable({
          items: ["B"],
        });
      });

      it('with intent "set" should notify with a "set" update', async () => {
        const { root, applyRemoteOperations, subscribe } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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
            type: OpCode.CREATE_REGISTER,
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

      it('with intent "set" should insert item if conflict with a delete operation', async () => {
        const { root, assertImmutable, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedObject("root", {}),
              createSerializedList("0:0", "root", "items"),
              createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
            ],
            1
          );

        const items = root.get("items");

        assertImmutable({
          items: ["A"],
        });

        items.delete(0);

        assertImmutable({
          items: [],
        });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_REGISTER,
            id: "0:2",
            parentId: "0:0",
            parentKey: FIRST_POSITION,
            data: "B",
            intent: "set",
          },
        ]);

        assertImmutable({
          items: ["B"],
        });
      });

      it('with intent "set" should notify with a "insert" update if no item exists at this position', async () => {
        const { root, applyRemoteOperations, subscribe } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
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
            type: OpCode.CREATE_REGISTER,
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
        const { root, assertImmutable, applyRemoteOperations, subscribe } =
          await prepareIsolatedStorageTest<{ items: LiveList<string> }>(
            [
              createSerializedObject("0:0", {}),
              createSerializedList("0:1", "0:0", "items"),
            ],
            1
          );

        const items = root.get("items");

        // Register id = 1:0
        items.push("0");

        assertImmutable({
          items: ["0"],
        });

        const callback = jest.fn();

        subscribe(items, callback, { isDeep: true });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_REGISTER,
            id: "2:1",
            parentId: "0:1",
            parentKey: FIRST_POSITION,
            data: "1",
          },
        ]);

        assertImmutable({
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
  });
});
