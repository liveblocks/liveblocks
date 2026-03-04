import { describe, expect, test, vi } from "vitest";

import { prepareStorageTest, waitFor } from "../../__tests__/_liveblocks";
import type { LiveList } from "../LiveList";
import type { LiveMap } from "../LiveMap";
import type { LiveObject } from "../LiveObject";

describe("Storage", () => {
  describe("subscribe generic", () => {
    test("simple action", async () => {
      const { roomA: room, storageA: storage } = await prepareStorageTest<{
        a: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

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
      const { roomA, storageA, storageB } = await prepareStorageTest<{
        a: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      const callback = vi.fn();

      const unsubscribe = roomA.subscribe(callback);

      storageB.root.set("a", 1);
      await waitFor(() => storageA.root.get("a") === 1);

      unsubscribe();

      storageB.root.set("a", 2);
      await waitFor(() => storageA.root.get("a") === 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storageA.root,
          updates: { a: { type: "update" } },
        },
      ]);
    });

    test("remote action with multipe updates on same object", async () => {
      const { roomA, roomB, storageA, storageB } = await prepareStorageTest<{
        a: number;
        b?: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      const callback = vi.fn();

      const unsubscribe = roomA.subscribe(callback);

      roomB.batch(() => {
        storageB.root.set("a", 1);
        storageB.root.set("b", 1);
      });
      await waitFor(() => storageA.root.get("a") === 1);

      unsubscribe();

      storageB.root.set("a", 2);
      await waitFor(() => storageA.root.get("a") === 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: storageA.root,
          updates: { a: { type: "update" }, b: { type: "update" } },
        },
      ]);
    });

    test("batch actions on a single LiveObject", async () => {
      const {
        roomA: room,
        storageA: storage,
        assertUndoRedo,
      } = await prepareStorageTest<{
        a: number;
        b: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0, b: 0 },
      });

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

      await assertUndoRedo();
    });

    test("batch actions on multiple LiveObjects", async () => {
      const { roomA: room, storageA: storage } = await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          a: 0,
          child: { liveblocksType: "LiveObject", data: { b: 0 } },
        },
      });

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
      const { roomA: room, storageA: storage } = await prepareStorageTest<{
        a: number;
        childObj: LiveObject<{ b: number }>;
        childList: LiveList<string>;
        childMap: LiveMap<string, string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          a: 0,
          childObj: { liveblocksType: "LiveObject", data: { b: 0 } },
          childList: { liveblocksType: "LiveList", data: [] },
          childMap: { liveblocksType: "LiveMap", data: {} },
        },
      });

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
      const {
        roomA: room,
        storageA: storage,
        expectStorage,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      const items = storage.root.get("items");

      room.batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      await expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      await expectStorage({
        items: [],
      });

      room.history.redo();

      await expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("nesting batches makes inner batches a no-op", async () => {
      const {
        roomA: room,
        storageA: storage,
        expectStorage,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

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

      await expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      await expectStorage({
        items: [],
      });

      room.history.redo();

      await expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("batch callbacks can return a value", async () => {
      const { roomA: room, storageA: storage } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

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
      const { roomA: room } = await prepareStorageTest<{ a: number }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      room.batch(() => {
        expect(() => room.history.undo()).toThrow();
      });
    });

    test("calling redo during a batch should throw", async () => {
      const { roomA: room } = await prepareStorageTest<{ a: number }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      room.batch(() => {
        expect(() => room.history.redo()).toThrow();
      });
    });
  });

  describe("undo / redo", () => {
    test("list.push", async () => {
      const {
        storageA: storage,
        expectStorage,
        assertUndoRedo,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      const items = storage.root.get("items");

      await expectStorage({ items: [] });

      items.push("A");
      await expectStorage({
        items: ["A"],
      });

      items.push("B");
      await expectStorage({
        items: ["A", "B"],
      });

      await assertUndoRedo();
    });

    test("max undo-redo stack", async () => {
      const { roomA: room, storageA: storage } = await prepareStorageTest<{
        a: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      for (let i = 0; i < 100; i++) {
        storage.root.set("a", i + 1);
      }

      expect(storage.root.toImmutable()).toEqual({ a: 100 });

      for (let i = 0; i < 100; i++) {
        room.history.undo();
      }

      // Max undo stack is 50, so undoing 100 times only goes back to 50
      expect(storage.root.toImmutable()).toEqual({ a: 50 });
    });

    test("storage operation should clear redo stack", async () => {
      const {
        roomA: room,
        storageA: storage,
        expectStorage,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      const items = storage.root.get("items");

      await expectStorage({ items: [] });

      items.insert("A", 0);
      await expectStorage({
        items: ["A"],
      });

      room.history.undo();

      items.insert("B", 0);
      await expectStorage({
        items: ["B"],
      });

      room.history.redo();

      await expectStorage({
        items: ["B"],
      });
    });
  });
});
