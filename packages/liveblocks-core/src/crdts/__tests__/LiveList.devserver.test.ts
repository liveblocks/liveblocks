/**
 * LiveList tests that run against the real dev server.
 *
 * For edge cases that require precise control over wire-level ops (CRDT
 * conflict resolution, reconnection behavior), see LiveList.mockserver.test.ts.
 */
import { describe, expect, onTestFinished, test, vi } from "vitest";

import {
  prepareIsolatedStorageTest,
  prepareStorageTest,
  prepareStorageUpdateTest,
} from "../../__tests__/_devserver";
import {
  listUpdate,
  listUpdateDelete,
  listUpdateInsert,
  listUpdateMove,
} from "../../__tests__/_updatesUtils";
import { kInternal } from "../../internal";
import { LiveList } from "../LiveList";
import { LiveMap } from "../LiveMap";
import { LiveObject } from "../LiveObject";

describe("LiveList", () => {
  describe("not attached", () => {
    test("basic operations with native objects", () => {
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
    test("create document with list in root", async () => {
      const { expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<never>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      expectStorage({
        items: [],
      });
    });

    test("init list with items", async () => {
      const { expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: {
            liveblocksType: "LiveList",
            data: [
              { liveblocksType: "LiveObject", data: { a: 0 } },
              { liveblocksType: "LiveObject", data: { a: 1 } },
              { liveblocksType: "LiveObject", data: { a: 2 } },
            ],
          },
        },
      });

      expectStorage({
        items: [{ a: 0 }, { a: 1 }, { a: 2 }],
      });
    });
  });

  describe("push", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.push("first")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    describe("updates", () => {
      test("push on empty list update", async () => {
        const {
          rootA: root,
          expectUpdates,
          roomA: room,
        } = await prepareStorageUpdateTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        });

        root.get("items").push("a");
        room.history.undo();
        room.history.redo();

        await expectUpdates([
          [listUpdate(["a"], [listUpdateInsert(0, "a")])],
          [listUpdate([], [listUpdateDelete(0, "a")])],
          [listUpdate(["a"], [listUpdateInsert(0, "a")])],
        ]);
      });
    });

    test("push LiveObject on empty list", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveObject<{ a: number }>>;
        }>({
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        });

      const root = storageA.root;
      const items = root.get("items");

      await expectStorage({
        items: [],
      });

      items.push(new LiveObject({ a: 0 }));

      await expectStorage({
        items: [{ a: 0 }],
      });

      await assertUndoRedo();
    });

    test("push number on empty list", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<number>;
        }>({
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        });

      const root = storageA.root;
      const items = root.toObject().items;

      await expectStorage({ items: [] });

      items.push(0);
      await expectStorage({ items: [0] });

      await assertUndoRedo();
    });

    test("push LiveMap on empty list", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveMap<string, number>>;
        }>({
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        });

      const root = storageA.root;
      const items = root.get("items");

      await expectStorage({ items: [] });

      items.push(new LiveMap([["first", 0]]));

      await expectStorage({ items: [{ first: 0 }] });

      await assertUndoRedo();
    });

    test("push already attached LiveObject should throw", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ a: number }>>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      const items = root.toObject().items;

      const object = new LiveObject({ a: 0 });

      items.push(object);
      expect(() => items.push(object)).toThrow();
    });
  });

  describe("insert", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.insert("first", 0)).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    describe("updates", () => {
      test("insert at the middle update", async () => {
        const {
          rootA: root,
          expectUpdates,
          roomA: room,
        } = await prepareStorageUpdateTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "C"] },
          },
        });

        root.get("items").insert("B", 1);
        room.history.undo();
        room.history.redo();

        await expectUpdates([
          [listUpdate(["A", "B", "C"], [listUpdateInsert(1, "B")])],
          [listUpdate(["A", "C"], [listUpdateDelete(1, "B")])],
          [listUpdate(["A", "B", "C"], [listUpdateInsert(1, "B")])],
        ]);
      });
    });

    test("insert LiveObject at position 0", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveObject<{ a: number }>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: {
              liveblocksType: "LiveList",
              data: [{ liveblocksType: "LiveObject", data: { a: 1 } }],
            },
          },
        });

      await expectStorage({
        items: [{ a: 1 }],
      });

      const root = storageA.root;
      const items = root.toObject().items;

      items.insert(new LiveObject({ a: 0 }), 0);

      await expectStorage({ items: [{ a: 0 }, { a: 1 }] });

      await assertUndoRedo();
    });
  });

  describe("delete", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.delete(0)).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    describe("updates", () => {
      test("delete first update", async () => {
        const {
          rootA: root,
          expectUpdates,
          roomA: room,
        } = await prepareStorageUpdateTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A"] },
          },
        });

        root.get("items").delete(0);
        room.history.undo();
        room.history.redo();

        await expectUpdates([
          [listUpdate([], [listUpdateDelete(0, "A")])],
          [listUpdate(["A"], [listUpdateInsert(0, "A")])],
          [listUpdate([], [listUpdateDelete(0, "A")])],
        ]);
      });
    });

    test("delete first item", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B"] },
          },
        });

      const root = storageA.root;
      const items = root.toObject().items;

      await expectStorage({
        items: ["A", "B"],
      });

      items.delete(0);

      await expectStorage({
        items: ["B"],
      });

      await assertUndoRedo();
    });

    test("delete should remove descendants", async () => {
      const { roomA, storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveObject<{ child: LiveObject<{ a: number }> }>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: {
              liveblocksType: "LiveList",
              data: [
                {
                  liveblocksType: "LiveObject",
                  data: {
                    child: {
                      liveblocksType: "LiveObject",
                      data: { a: 0 },
                    },
                  },
                },
              ],
            },
          },
        });

      await expectStorage({
        items: [{ child: { a: 0 } }],
      });

      storageA.root.toObject().items.delete(0);

      await expectStorage({
        items: [],
      });

      // Ensure that LiveStructure are deleted properly
      expect(roomA[kInternal].nodeCount).toBe(2);

      await assertUndoRedo();
    });
  });

  describe("move", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.move(0, 1)).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    describe("updates", () => {
      test("move at the end update", async () => {
        const {
          rootA: root,
          expectUpdates,
          roomA: room,
        } = await prepareStorageUpdateTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B"] },
          },
        });

        root.get("items").move(0, 1);
        room.history.undo();
        room.history.redo();

        await expectUpdates([
          [listUpdate(["B", "A"], [listUpdateMove(0, 1, "A")])],
          [listUpdate(["A", "B"], [listUpdateMove(1, 0, "A")])],
          [listUpdate(["B", "A"], [listUpdateMove(0, 1, "A")])],
        ]);
      });
    });

    test("move after current position", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      await expectStorage({
        items: ["A", "B", "C"],
      });

      const root = storageA.root;
      const items = root.toObject().items;
      items.move(0, 1);

      await expectStorage({ items: ["B", "A", "C"] });

      await assertUndoRedo();
    });

    test("move before current position", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      await expectStorage({
        items: ["A", "B", "C"],
      });

      const items = storageA.root.get("items");

      items.move(0, 1);
      await expectStorage({
        items: ["B", "A", "C"],
      });

      await assertUndoRedo();
    });

    test("move at the end of the list", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      await expectStorage({
        items: ["A", "B", "C"],
      });

      const root = storageA.root;
      const items = root.toObject().items;
      items.move(0, 2);

      await expectStorage({
        items: ["B", "C", "A"],
      });

      await assertUndoRedo();
    });
  });

  describe("clear", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.clear()).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    describe("updates", () => {
      test("clear updates", async () => {
        const {
          rootA: root,
          expectUpdates,
          roomA: room,
        } = await prepareStorageUpdateTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B"] },
          },
        });

        root.get("items").clear();
        room.history.undo();
        room.history.redo();

        await expectUpdates([
          [
            listUpdate(
              [],
              [listUpdateDelete(0, "A"), listUpdateDelete(0, "B")]
            ),
          ],
          [
            listUpdate(
              ["A", "B"],
              [listUpdateInsert(0, "A"), listUpdateInsert(1, "B")]
            ),
          ],
          // Because redo reverse the operations, we delete items from the end
          [
            listUpdate(
              [],
              [listUpdateDelete(1, "B"), listUpdateDelete(0, "A")]
            ),
          ],
        ]);
      });
    });

    test("clear should delete all items", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      const root = storageA.root;
      const items = root.get("items");

      await expectStorage({
        items: ["A", "B", "C"],
      });

      items.clear();
      await expectStorage({
        items: [],
      });

      await assertUndoRedo();
    });
  });

  describe("batch", () => {
    test("batch multiple inserts", async () => {
      const {
        roomA: room,
        storageA,
        expectStorage,
        assertUndoRedo,
      } = await prepareStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: { items: { liveblocksType: "LiveList", data: [] } },
      });

      const items = storageA.root.get("items");

      await expectStorage({ items: [] });

      room.batch(() => {
        items.push("A");
        items.push("B");
      });

      await expectStorage(
        { items: ["A", "B"] }
        // Updates are not tested here because undo/redo is not symetric
      );

      await assertUndoRedo();
    });
  });

  describe("set", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: { items: { liveblocksType: "LiveList", data: [] } },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      const items = root.get("items");

      expect(() => items.set(0, "A")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    test("set register on detached list", () => {
      const list = new LiveList<string>(["A", "B", "C"]);
      list.set(0, "D");
      expect(list.toArray()).toEqual(["D", "B", "C"]);
    });

    test("set at invalid position should throw", () => {
      const list = new LiveList<string>(["A", "B", "C"]);
      expect(() => list.set(-1, "D")).toThrow(
        'Cannot set list item at index "-1". index should be between 0 and 2'
      );
      expect(() => list.set(3, "D")).toThrow(
        'Cannot set list item at index "3". index should be between 0 and 2'
      );
    });

    test("set register", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<string>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: { liveblocksType: "LiveList", data: ["A", "B", "C"] },
          },
        });

      const root = storageA.root;
      const items = root.toObject().items;

      await expectStorage({ items: ["A", "B", "C"] });

      items.set(0, "D");
      await expectStorage({ items: ["D", "B", "C"] });

      items.set(1, "E");
      await expectStorage({ items: ["D", "E", "C"] });

      await assertUndoRedo();
    });

    test("set nested object", async () => {
      const { storageA, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          items: LiveList<LiveObject<{ a: number }>>;
        }>({
          liveblocksType: "LiveObject",
          data: {
            items: {
              liveblocksType: "LiveList",
              data: [{ liveblocksType: "LiveObject", data: { a: 1 } }],
            },
          },
        });

      const root = storageA.root;
      const items = root.toObject().items;

      await expectStorage({ items: [{ a: 1 }] });

      items.set(0, new LiveObject({ a: 2 }));
      await expectStorage({ items: [{ a: 2 }] });

      await assertUndoRedo();
    });
  });

  describe("subscriptions", () => {
    test("batch multiple actions", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: { liveblocksType: "LiveList", data: ["a"] },
        },
      });

      const callback = vi.fn();
      onTestFinished(room.events.storageBatch.subscribe(callback));

      const liveList = root.get("items");

      room.batch(() => {
        liveList.push("b");
        liveList.push("c");
      });

      expectStorage({ items: ["a", "b", "c"] });

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
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: { liveblocksType: "LiveList", data: ["a"] },
        },
      });

      const callback = vi.fn();
      onTestFinished(room.events.storageBatch.subscribe(callback));

      const liveList = root.get("items");

      room.batch(() => {
        liveList.insert("b", 1);
        liveList.insert("c", 2);
      });

      expectStorage({ items: ["a", "b", "c"] });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("hasCache", () => {
    test("returns true when cached JSON matches the given value", () => {
      const list = new LiveList(["a", "b", "c"]);
      const json = list.toJSON();
      expect(list.hasCache(json)).toBe(true);
    });

    test("returns true when cached immutable matches the given value", () => {
      const list = new LiveList(["a", "b", "c"]);
      const imm = list.toImmutable();
      expect(list.hasCache(imm)).toBe(true);
    });

    test("returns false for a different array with equal contents", () => {
      const list = new LiveList(["a", "b"]);
      list.toJSON();
      expect(list.hasCache(["a", "b"])).toBe(false);
    });

    test("returns false when cache has been invalidated", () => {
      const list = new LiveList<string>(["a"]);
      const json = list.toJSON();
      list.push("b");
      expect(list.hasCache(json)).toBe(false);
    });

    test("returns false when toJSON has never been called", () => {
      const list = new LiveList([1, 2, 3]);
      expect(list.hasCache([1, 2, 3])).toBe(false);
    });
  });
});
