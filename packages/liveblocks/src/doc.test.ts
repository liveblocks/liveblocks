import { Op, OpType } from "./live";
import { Doc } from "./doc";
import { LiveList } from "./LiveList";
import { LiveMap } from "./LiveMap";
import { LiveObject } from "./LiveObject";
import {
  prepareStorageTest,
  createSerializedObject,
  createSerializedList,
} from "../test/utils";

describe("Storage", () => {
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
