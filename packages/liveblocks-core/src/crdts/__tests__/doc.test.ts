import { describe, expect, test, vi } from "vitest";

import {
  createSerializedList,
  createSerializedMap,
  createSerializedObject,
  createSerializedRoot,
  prepareStorageTest,
} from "../../__tests__/_utils";
import { OpCode } from "../../protocol/Op";
import type { LiveList } from "../LiveList";
import type { LiveMap } from "../LiveMap";
import type { LiveObject } from "../LiveObject";

describe("Storage", () => {
  describe("subscribe generic", () => {
    test("simple action", async () => {
      const { room, storage } = await prepareStorageTest<{ a: number }>(
        [createSerializedRoot({ a: 0 })],
        1
      );

      const callback = vi.fn();

      const unsubscribe = room.subscribe(callback);

      storage.root.set("a", 1);

      unsubscribe();

      storage.root.set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" } },
        },
      ]);
    });

    test("remote action", async () => {
      const { room, storage, applyRemoteOperations } =
        await prepareStorageTest<{ a: number }>(
          [createSerializedRoot({ a: 0 })],
          1
        );

      const callback = vi.fn();

      const unsubscribe = room.subscribe(callback);

      applyRemoteOperations([
        { type: OpCode.UPDATE_OBJECT, data: { a: 1 }, opId: "", id: "root" },
      ]);

      unsubscribe();

      applyRemoteOperations([
        { type: OpCode.UPDATE_OBJECT, data: { a: 2 }, opId: "", id: "root" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" } },
        },
      ]);
    });

    test("remote action with multipe updates on same object", async () => {
      const { room, storage, applyRemoteOperations } =
        await prepareStorageTest<{ a: number }>(
          [createSerializedRoot({ a: 0 })],
          1
        );

      const callback = vi.fn();

      const unsubscribe = room.subscribe(callback);

      applyRemoteOperations([
        { type: OpCode.UPDATE_OBJECT, data: { a: 1 }, opId: "", id: "root" },
        { type: OpCode.UPDATE_OBJECT, data: { b: 1 }, opId: "", id: "root" },
      ]);

      unsubscribe();

      applyRemoteOperations([
        { type: OpCode.UPDATE_OBJECT, data: { a: 2 }, opId: "", id: "root" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" }, b: { type: "update" } },
        },
      ]);
    });

    test("batch actions on a single LiveObject", async () => {
      const { room, storage, assertUndoRedo } = await prepareStorageTest<{
        a: number;
        b: number;
      }>([createSerializedRoot({ a: 0, b: 0 })], 1);

      const callback = vi.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(callback);

      room.batch(() => {
        root.set("a", 1);
        root.set("b", 1);
      });

      unsubscribe();

      room.batch(() => {
        root.set("a", 2);
        root.set("b", 2);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" }, b: { type: "update" } },
        },
      ]);

      assertUndoRedo();
    });

    test("batch actions on multiple LiveObjects", async () => {
      const { room, storage } = await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>(
        [
          createSerializedRoot({ a: 0 }),
          createSerializedObject("0:1", { b: 0 }, "root", "child"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      room.subscribe(callback);

      room.batch(() => {
        root.set("a", 1);
        root.get("child").set("b", 1);
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" } },
        },
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { b: { type: "update" } },
        },
      ]);
    });

    test("batch actions on multiple Live types", async () => {
      const { room, storage } = await prepareStorageTest<{
        a: number;
        childObj: LiveObject<{ b: number }>;
        childList: LiveList<string>;
        childMap: LiveMap<string, string>;
      }>(
        [
          createSerializedRoot({ a: 0 }),
          createSerializedObject("0:1", { b: 0 }, "root", "childObj"),
          createSerializedList("0:2", "root", "childList"),
          createSerializedMap("0:3", "root", "childMap"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      room.subscribe(callback);

      room.batch(() => {
        root.set("a", 1);
        root.get("childObj").set("b", 1);
        root.get("childList").push("item1");
        root.get("childMap").set("el1", "v1");
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storage.root,
          updates: { a: { type: "update" } },
        },
        {
          type: "LiveObject",
          node: root.get("childObj"),
          updates: { b: { type: "update" } },
        },
        {
          type: "LiveList",
          node: root.get("childList"),
          updates: [{ index: 0, item: "item1", type: "insert" }],
        },
        {
          type: "LiveMap",
          node: root.get("childMap"),
          updates: { el1: { type: "update" } },
        },
      ]);
    });
  });

  describe("batching", () => {
    test("batching and undo", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [createSerializedRoot(), createSerializedList("0:1", "root", "items")],
        1
      );

      const items = storage.root.get("items");

      room.batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      expectStorage({
        items: [],
      });

      room.history.redo();

      expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("nesting batches makes inner batches a no-op", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [createSerializedRoot(), createSerializedList("0:1", "root", "items")],
        1
      );

      const items = storage.root.get("items");

      room.batch(() => {
        room.batch(() => {
          room.batch(() => {
            items.push("A");
            room.batch(() => {
              room.batch(() => {
                items.push("B");
                room.batch(() => {
                  room.batch(() => {
                    room.batch(() => {
                      items.push("C");
                    });
                  });
                });
              });
            });
          });
        });
      });

      expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      expectStorage({
        items: [],
      });

      room.history.redo();

      expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("batch callbacks can return a value", async () => {
      const { room, storage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [createSerializedRoot(), createSerializedList("0:1", "root", "items")],
        1
      );

      const items = storage.root.get("items");

      const numInserted = room.batch(() => {
        const before = items.length;
        items.push("A");
        items.push("B");
        items.push("C");
        return items.length - before;
      });

      expect(numInserted).toEqual(3);
    });

    test("calling undo during a batch should throw", async () => {
      const { room } = await prepareStorageTest<{ a: number }>(
        [createSerializedRoot({ a: 0 })],
        1
      );

      room.batch(() => {
        expect(() => room.history.undo()).toThrow();
      });
    });

    test("calling redo during a batch should throw", async () => {
      const { room } = await prepareStorageTest<{ a: number }>(
        [createSerializedRoot({ a: 0 })],
        1
      );

      room.batch(() => {
        expect(() => room.history.redo()).toThrow();
      });
    });
  });

  describe("undo / redo", () => {
    test("list.push", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>(
          [
            createSerializedRoot(),
            createSerializedList("0:1", "root", "items"),
          ],
          1
        );

      const items = storage.root.get("items");

      expectStorage({ items: [] });

      items.push("A");
      expectStorage({
        items: ["A"],
      });

      items.push("B");
      expectStorage({
        items: ["A", "B"],
      });

      assertUndoRedo();
    });

    test("max undo-redo stack", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        a: number;
      }>([createSerializedRoot({ a: 0 })], 1);

      for (let i = 0; i < 100; i++) {
        storage.root.set("a", i + 1);
        expectStorage({
          a: i + 1,
        });
      }

      for (let i = 0; i < 100; i++) {
        room.history.undo();
      }

      expectStorage({
        a: 50,
      });
    });

    test("storage operation should clear redo stack", async () => {
      const { room, storage, expectStorage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>(
        [createSerializedRoot(), createSerializedList("0:1", "root", "items")],
        1
      );

      const items = storage.root.get("items");

      expectStorage({ items: [] });

      items.insert("A", 0);
      expectStorage({
        items: ["A"],
      });

      room.history.undo();

      items.insert("B", 0);
      expectStorage({
        items: ["B"],
      });

      room.history.redo();

      expectStorage({
        items: ["B"],
      });
    });
  });
});
