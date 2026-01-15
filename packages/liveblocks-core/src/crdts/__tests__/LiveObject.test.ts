import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { objectUpdate } from "../../__tests__/_updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  createSerializedRoot,
  prepareDisconnectedStorageUpdateTest,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  replaceRemoteStorageAndReconnect,
} from "../../__tests__/_utils";
import { waitUntilStorageUpdate } from "../../__tests__/_waitUtils";
import { kInternal } from "../../internal";
import { Permission } from "../../protocol/AuthToken";
import { OpCode } from "../../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../../protocol/SerializedCrdt";
import { CrdtType } from "../../protocol/SerializedCrdt";
import { LiveList } from "../LiveList";
import { LiveObject } from "../LiveObject";

describe("LiveObject", () => {
  describe("roomId", () => {
    test("should be null for orphan", () => {
      expect(new LiveObject().roomId).toBeNull();
    });

    test("should be the associated room id if attached", async () => {
      const { root } = await prepareIsolatedStorageTest(
        [createSerializedRoot()],
        1
      );

      expect(root.roomId).toBe("room-id");
    });

    test("should be null after being detached", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedRoot(),
          createSerializedObject("0:0", { a: 0 }, "root", "child"),
        ],
        1
      );

      const child = root.get("child");

      expect(child.roomId).toBe("room-id");

      root.set("child", new LiveObject({ a: 1 }));

      expect(child.roomId).toBe(null);
    });
  });

  test("update non existing property", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedRoot()]
    );

    expectStorage({});

    storage.root.update({ a: 1 });
    expectStorage({
      a: 1,
    });

    assertUndoRedo();
  });

  test("update non existing property with null", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedRoot()]
    );

    expectStorage({});

    storage.root.update({ a: null });
    expectStorage({
      a: null,
    });

    assertUndoRedo();
  });

  test("update throws on read-only", async () => {
    const { storage } = await prepareStorageTest(
      [createSerializedRoot({ a: 0 })],
      1,
      [Permission.Read, Permission.PresenceWrite]
    );

    expect(() => storage.root.update({ a: 1 })).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("update existing property", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedRoot({ a: 0 })]
    );

    expectStorage({ a: 0 });

    storage.root.update({ a: 1 });
    expectStorage({
      a: 1,
    });

    assertUndoRedo();
  });

  test("update existing property with null", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedRoot({ a: 0 })]
    );

    expectStorage({ a: 0 });

    storage.root.update({ a: null });
    expectStorage({
      a: null,
    });

    assertUndoRedo();
  });

  test("update root", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedRoot({ a: 0 })]
    );

    expectStorage({
      a: 0,
    });

    storage.root.update({ a: 1 });
    expectStorage({
      a: 1,
    });

    storage.root.update({ b: 1 });
    expectStorage({
      a: 1,
      b: 1,
    });

    assertUndoRedo();
  });

  test("set throws on read-only", async () => {
    const { storage } = await prepareStorageTest([createSerializedRoot()], 1, [
      Permission.Read,
      Permission.PresenceWrite,
    ]);

    expect(() => storage.root.set("a", 1)).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("update with LiveObject", async () => {
    const { room, storage, expectStorage, operations, assertUndoRedo } =
      await prepareStorageTest<{ child: LiveObject<{ a: number }> | null }>(
        [createSerializedRoot({ child: null })],
        1
      );

    const root = storage.root;

    expectStorage({
      child: null,
    });

    root.set("child", new LiveObject({ a: 0 }));

    expectStorage({
      child: {
        a: 0,
      },
    });
    expect(room[kInternal].undoStack[0]).toEqual([
      {
        type: OpCode.UPDATE_OBJECT,
        id: "root",
        data: {
          child: null,
        },
      },
    ]);

    expect(operations.length).toEqual(1);
    expect(operations).toEqual([
      {
        type: OpCode.CREATE_OBJECT,
        id: "1:0",
        opId: "1:1",
        data: { a: 0 },
        parentId: "root",
        parentKey: "child",
      },
    ]);

    root.set("child", null);

    expectStorage({
      child: null,
    });
    expect(room[kInternal].undoStack[1]).toEqual([
      {
        type: OpCode.CREATE_OBJECT,
        id: "1:0",
        data: { a: 0 },
        parentId: "root",
        parentKey: "child",
      },
    ]);

    assertUndoRedo();
  });

  test("remove nested grand child record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{
          b: number;
          grandChild: LiveObject<{ c: number }>;
        }> | null;
      }>([
        createSerializedRoot({ a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "root", "child"),
        createSerializedObject("0:2", { c: 0 }, "0:1", "grandChild"),
      ]);

    expectStorage({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 0,
        },
      },
    });

    storage.root.update({ child: null });

    expectStorage({
      a: 0,
      child: null,
    });
    expect(room[kInternal].nodeCount).toBe(1);

    assertUndoRedo();
  });

  test("remove nested child record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }> | null;
      }>([
        createSerializedRoot({ a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "root", "child"),
      ]);

    expectStorage({
      a: 0,
      child: {
        b: 0,
      },
    });

    storage.root.update({ child: null });

    expectStorage({
      a: 0,
      child: null,
    });
    expect(room[kInternal].nodeCount).toBe(1);

    assertUndoRedo();
  });

  test("add nested record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest([createSerializedRoot()], 1);

    expectStorage({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    expectStorage({
      child: {
        a: 0,
      },
    });

    expect(room[kInternal].nodeCount).toBe(2);

    assertUndoRedo();
  });

  test("replace nested record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest([createSerializedRoot()], 1);

    expectStorage({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    expectStorage({
      child: {
        a: 0,
      },
    });

    storage.root.update({
      child: new LiveObject({ a: 1 }),
    });

    expectStorage({
      child: {
        a: 1,
      },
    });

    expect(room[kInternal].nodeCount).toBe(2);

    assertUndoRedo();
  });

  test("update nested record", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>([
        createSerializedRoot({ a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "root", "child"),
      ]);

    const root = storage.root;
    const child = root.toObject().child;

    expectStorage({
      a: 0,
      child: {
        b: 0,
      },
    });

    child.update({ b: 1 });
    expectStorage({
      a: 0,
      child: {
        b: 1,
      },
    });

    assertUndoRedo();
  });

  test("update deeply nested record", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number; grandChild: LiveObject<{ c: number }> }>;
      }>([
        createSerializedRoot({ a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "root", "child"),
        createSerializedObject("0:2", { c: 0 }, "0:1", "grandChild"),
      ]);

    expectStorage({
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

    expectStorage({
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

  describe("acknowledge mechanism", () => {
    test("should not ignore history updates if the current op has not been acknowledged", async () => {
      const { room, root, expectUpdates } =
        await prepareDisconnectedStorageUpdateTest<{
          items: LiveObject<{ b?: string; a?: string }>;
        }>([
          createSerializedRoot(),
          createSerializedObject("0:1", { a: "initial" }, "root", "items"),
        ]);

      const items = root.get("items");
      room.batch(() => {
        items.set("a", "A");
        items.set("b", "B");
      });

      expect(items.toObject()).toEqual({ a: "A", b: "B" });
      expectUpdates([
        [
          objectUpdate(
            { a: "A", b: "B" },
            { a: { type: "update" }, b: { type: "update" } }
          ),
        ],
      ]);

      room.history.undo();

      expect(items.toObject()).toEqual({ a: "initial" });
      expectUpdates([
        [
          objectUpdate(
            { a: "A", b: "B" },
            { a: { type: "update" }, b: { type: "update" } }
          ),
        ],
        [
          objectUpdate<{ a?: string; b?: string }>(
            { a: "initial" },
            { a: { type: "update" }, b: { type: "delete", deletedItem: "B" } }
          ),
        ],
      ]);
    });

    describe("should ignore incoming updates if the current op has not been acknowledged", () => {
      test("when value is not a crdt", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ a: number }>(
            [createSerializedRoot({ a: 0 })],
            1
          );

        expectStorage({ a: 0 });

        root.set("a", 1);

        expectStorage({ a: 1 });

        applyRemoteOperations([
          {
            type: OpCode.UPDATE_OBJECT,
            data: { a: 2 },
            id: "root",
          },
        ]);

        expectStorage({ a: 1 });
      });

      test("when value is a LiveObject", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{
            a: LiveObject<{ subA: number }>;
          }>(
            [
              createSerializedRoot(),
              createSerializedObject("0:1", { subA: 0 }, "root", "a"),
            ],
            1
          );

        expectStorage({ a: { subA: 0 } });

        root.set("a", new LiveObject({ subA: 1 }));

        expectStorage({ a: { subA: 1 } });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_OBJECT,
            data: { subA: 2 },
            id: "2:0",
            parentKey: "a",
            parentId: "root",
          },
        ]);

        expectStorage({ a: { subA: 1 } });
      });

      test("when value is a LiveList with LiveObjects", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{
            a: LiveList<LiveObject<{ b: number }>>;
          }>(
            [createSerializedRoot(), createSerializedList("0:1", "root", "a")],
            1
          );

        expectStorage({ a: [] });

        const newList = new LiveList<LiveObject<{ b: number }>>([]);
        newList.push(new LiveObject({ b: 1 }));
        root.set("a", newList);

        expectStorage({ a: [{ b: 1 }] });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_LIST,
            id: "2:0",
            parentKey: "a",
            parentId: "root",
          },
        ]);

        expectStorage({ a: [{ b: 1 }] });
      });
    });
  });

  describe("delete", () => {
    test("throws on read-only", async () => {
      const { storage } = await prepareStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedRoot({ a: 1 }),
          createSerializedObject("0:1", { b: 2 }, "root", "child"),
        ],
        1,
        [Permission.Read, Permission.PresenceWrite]
      );

      expect(() => storage.root.get("child").delete("a")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    test("detached", () => {
      const liveObject = new LiveObject({ a: 0 });
      liveObject.delete("a");
      expect(liveObject.get("a")).toBe(undefined);
    });

    test("should delete property from the object", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          a?: number;
        }>([createSerializedRoot({ a: 0 })]);
      expectStorage({ a: 0 });

      storage.root.delete("a");
      expectStorage({});

      assertUndoRedo();
    });

    test("should delete nested crdt", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          child?: LiveObject<{ a: number }>;
        }>([
          createSerializedRoot(),
          createSerializedObject("0:1", { a: 0 }, "root", "child"),
        ]);

      expectStorage({ child: { a: 0 } });

      storage.root.delete("child");
      expectStorage({});

      assertUndoRedo();
    });

    test("should not notify if property does not exist", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedRoot()]);

      const callback = vi.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(0);
    });

    test("should notify if property has been deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedRoot({ a: 1 })]);

      const callback = vi.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyDeleteObjectKey", () => {
    test("should not notify if property does not exist", async () => {
      const { room, root, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ a?: number }>([
          createSerializedRoot(),
        ]);

      const callback = vi.fn();
      room.subscribe(root, callback);

      applyRemoteOperations([
        { type: OpCode.DELETE_OBJECT_KEY, id: "root", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(0);
    });

    test("should notify if property has been deleted", async () => {
      const { room, root, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ a?: number }>([
          createSerializedRoot({ a: 1 }),
        ]);

      const callback = vi.fn();
      room.subscribe(root, callback);

      applyRemoteOperations([
        { type: OpCode.DELETE_OBJECT_KEY, id: "root", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { room, storage } = await prepareStorageTest<{ a: number }>(
        [createSerializedRoot({ a: 0 })],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      room.subscribe(root, callback);

      root.set("a", 1);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(storage.root);
    });

    test("subscribe multiple actions", async () => {
      const { room, storage } = await prepareStorageTest<{
        child: LiveObject<{ a: number }>;
        child2: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedRoot(),
          createSerializedObject("0:1", { a: 0 }, "root", "child"),
          createSerializedObject("0:2", { a: 0 }, "root", "child2"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root.get("child"), callback);

      root.get("child").set("a", 1);

      root.get("child2").set("a", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root.get("child"));
    });

    test("deep subscribe", async () => {
      const { room, storage } = await prepareStorageTest<{
        child: LiveObject<{ a: number; subchild: LiveObject<{ b: number }> }>;
      }>(
        [
          createSerializedRoot(),
          createSerializedObject("0:1", { a: 0 }, "root", "child"),
          createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
        ],
        1
      );

      const callback = vi.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);
      root.get("child").get("subchild").set("b", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { a: { type: "update" } },
        },
      ]);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child").get("subchild"),
          updates: { b: { type: "update" } },
        },
      ]);
    });

    test("deep subscribe remote operation", async () => {
      const { room, storage, applyRemoteOperations } =
        await prepareStorageTest<{
          child: LiveObject<{
            a: number;
            subchild: LiveObject<{ b: number }>;
          }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { a: 0 }, "root", "child"),
            createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
          ],
          1
        );

      const callback = vi.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);

      applyRemoteOperations([
        {
          type: OpCode.UPDATE_OBJECT,
          data: { b: 1 },
          id: "0:2",
        },
      ]);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { a: { type: "update" } },
        },
      ]);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child").get("subchild"),
          updates: { b: { type: "update" } },
        },
      ]);
    });

    test("subscribe subchild remote operation", async () => {
      const { room, storage, applyRemoteOperations } =
        await prepareStorageTest<{
          child: LiveObject<{
            a: number;
            subchild: LiveObject<{ b: number }>;
          }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { a: 0 }, "root", "child"),
            createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
          ],
          1
        );

      const callback = vi.fn();

      const root = storage.root;

      const subchild = root.get("child").get("subchild");

      const unsubscribe = room.subscribe(subchild, callback);

      applyRemoteOperations([
        {
          type: OpCode.UPDATE_OBJECT,
          data: { a: 1 },
          id: "0:1",
        },
        {
          type: OpCode.UPDATE_OBJECT,
          data: { b: 1 },
          id: "0:2",
        },
      ]);

      unsubscribe();

      root.get("child").get("subchild").set("b", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root.get("child").get("subchild"));
    });

    test("deep subscribe remote and local operation - delete object key", async () => {
      const { room, storage, applyRemoteOperations } =
        await prepareStorageTest<{
          child: LiveObject<{ a?: number; b?: number }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { a: -1, b: -2 }, "root", "child"),
          ],
          1
        );

      const callback = vi.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root, callback, { isDeep: true });

      // Remote deletion
      applyRemoteOperations([
        {
          type: OpCode.DELETE_OBJECT_KEY,
          key: "a",
          id: "0:1",
        },
      ]);

      // Local deletion
      root.get("child").delete("b");

      unsubscribe();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, [
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { a: { type: "delete", deletedItem: -1 } },
        },
      ]);
      expect(callback).toHaveBeenNthCalledWith(2, [
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { b: { type: "delete", deletedItem: -2 } },
        },
      ]);
    });
  });

  describe("reconnect with remote changes and subscribe", () => {
    test("LiveObject updated", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          obj: LiveObject<{ a: number }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { a: 1 }, "root", "obj"),
          ],
          1
        );

      const rootDeepCallback = vi.fn();
      const liveObjectCallback = vi.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            data: { a: 2 },
            parentId: "root",
            parentKey: "obj",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        obj: { a: 2 },
      });

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("obj"),
          updates: { a: { type: "update" } },
        },
      ]);

      expect(liveObjectCallback).toHaveBeenCalledTimes(1);
    });

    test("LiveObject updated nested", async () => {
      const { expectStorage, room, root, wss } =
        await prepareIsolatedStorageTest<{
          obj: LiveObject<{ a: number; subObj?: LiveObject<{ b: number }> }>;
        }>(
          [
            createSerializedRoot(),
            createSerializedObject("0:1", { a: 1 }, "root", "obj"),
          ],
          1
        );

      const rootDeepCallback = vi.fn();
      const liveObjectCallback = vi.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["root", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            data: { a: 1 },
            parentId: "root",
            parentKey: "obj",
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.OBJECT,
            data: { b: 1 },
            parentId: "0:1",
            parentKey: "subObj",
          },
        ],
      ];

      replaceRemoteStorageAndReconnect(wss, newInitStorage);

      await waitUntilStorageUpdate(room);
      expectStorage({
        obj: { a: 1, subObj: { b: 1 } },
      });

      expect(rootDeepCallback).toHaveBeenCalledTimes(1);

      expect(rootDeepCallback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("obj"),
          updates: {
            subObj: { type: "update" },
          },
        },
      ]);

      expect(liveObjectCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe("undo apply update", () => {
    test("subscription should gives the right update", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        a: number;
      }>([createSerializedRoot({ a: 0 })], 1);

      expectStorage({ a: 0 });
      root.set("a", 1);
      expectStorage({ a: 1 });

      const callback = vi.fn();
      room.subscribe(root, callback, { isDeep: true });

      room.history.undo();
      expectStorage({ a: 0 });

      expect(callback).toHaveBeenCalledWith([
        { type: "LiveObject", node: root, updates: { a: { type: "update" } } },
      ]);
    });
  });

  describe("internal methods", () => {
    test("_detachChild", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        obj: LiveObject<{
          a: LiveObject<{ subA: number }>;
          b: LiveObject<{ subA: number }>;
        }>;
      }>(
        [
          createSerializedRoot(),
          createSerializedObject("0:1", {}, "root", "obj"),
          createSerializedObject("0:2", { subA: 1 }, "0:1", "a"),
          createSerializedObject("0:3", { subA: 2 }, "0:1", "b"),
        ],
        1
      );

      const obj = root.get("obj");
      const secondItem = obj.get("b");

      const applyResult = obj._detachChild(secondItem);

      expect(applyResult).toEqual({
        modified: {
          node: obj,
          type: "LiveObject",
          updates: { b: { type: "delete" } },
        },
        reverse: [
          {
            data: { subA: 2 },
            id: "0:3",
            parentId: "0:1",
            parentKey: "b",
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });
  });

  describe("LiveObject.detectLargeObjects static property validation", () => {
    // Create a large string of specified size in bytes
    const createLargeData = (sizeInBytes: number) => {
      // JSON.stringify adds quotes around the string, so we need to account for that
      // Also account for the property name and JSON structure overhead
      const str = "a".repeat(sizeInBytes);
      return str;
    };

    beforeAll(() => {
      // Mock TextEncoder for Node.js test environment
      if (typeof global.TextEncoder === "undefined") {
        global.TextEncoder = class {
          encode(str: string) {
            return Buffer.from(str, "utf8");
          }
        } as any;
      }
    });

    afterEach(() => {
      // Reset detectLargeObjects flag after each test
      LiveObject.detectLargeObjects = false;
    });

    test("should NOT throw when LiveObject.detectLargeObjects property is disabled (default behavior)", () => {
      // Ensure LiveObject.detectLargeObjects property is disabled
      LiveObject.detectLargeObjects = false;

      const liveObject = new LiveObject<{ largeString?: string }>();
      const largeData = createLargeData(150 * 1024); // 150KB - exceeds 128KB limit

      // This should NOT throw since LiveObject.detectLargeObjects property is disabled
      expect(() => {
        liveObject.set("largeString", largeData);
      }).not.toThrow();
    });

    test("should throw when LiveObject.detectLargeObjects property is enabled and size exceeds 128KB", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<{ largeString?: string }>();
      const largeData = createLargeData(150 * 1024); // 150KB - exceeds 128KB limit

      // This should throw since LiveObject.detectLargeObjects property is enabled and data exceeds limit
      expect(() => {
        liveObject.set("largeString", largeData);
      }).toThrow(/LiveObject size exceeded limit.*bytes/);
    });

    test("should NOT throw when LiveObject.detectLargeObjects property is enabled but size is within limit", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<{ smallString?: string }>();
      const smallData = createLargeData(50 * 1024); // 50KB - within 128KB limit

      // This should NOT throw since data is within limit
      expect(() => {
        liveObject.set("smallString", smallData);
      }).not.toThrow();
    });

    test("should exclude Live structure references from size calculation", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<{
        largeString?: string;
        liveList?: LiveList<string>;
      }>();
      const largeData = createLargeData(150 * 1024); // 150KB - would exceed limit if counted
      const liveList = new LiveList<string>([]);

      // First set the Live structure reference - should not count toward size
      liveObject.set("liveList", liveList);

      // Now set large static data - should still throw because static data exceeds limit
      expect(() => {
        liveObject.set("largeString", largeData);
      }).toThrow(/LiveObject size exceeded limit/);

      // But if we only have the Live structure and small static data, it should be fine
      const liveObject2 = new LiveObject<{
        smallString?: string;
        liveList?: LiveList<string>;
      }>();
      const liveList2 = new LiveList<string>([]);
      liveObject2.set("liveList", liveList2);

      expect(() => {
        liveObject2.set("smallString", "small data");
      }).not.toThrow();
    });

    test("should throw when accumulating many small properties exceeds 128KB limit", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<Record<string, string>>();

      // Add many small properties that together approach the 128KB limit
      const smallData = createLargeData(10 * 1024); // 10KB each

      // Add 12 properties of 10KB each = 120KB total (under limit)
      for (let i = 0; i < 12; i++) {
        liveObject.set(`prop${i}`, smallData);
      }

      // This should still work (total ~120KB)
      expect(() => {
        liveObject.set("stillOk", "small");
      }).not.toThrow();

      // Now add one more 10KB property that pushes us over 128KB
      expect(() => {
        liveObject.set("finalProp", smallData); // This should push us over the limit
      }).toThrow(/LiveObject size exceeded limit/);
    });

    test("should correctly handle mixed small properties and Live structures", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<Record<string, any>>();

      // Add some Live structures (should not count toward size)
      const liveList1 = new LiveList<string>([]);
      const liveList2 = new LiveList<number>([]);
      liveObject.set("list1", liveList1);
      liveObject.set("list2", liveList2);

      // Add small static data properties that approach the limit
      const mediumData = createLargeData(20 * 1024); // 20KB each

      // Add 6 properties of 20KB each = 120KB total (under limit)
      for (let i = 0; i < 6; i++) {
        liveObject.set(`data${i}`, mediumData);
      }

      // Add another Live structure - should still be fine
      const liveList3 = new LiveList<boolean>([]);
      expect(() => {
        liveObject.set("list3", liveList3);
      }).not.toThrow();

      // Now add static data that pushes us over the limit
      expect(() => {
        liveObject.set("finalData", mediumData); // 20KB more = 140KB total
      }).toThrow(/LiveObject size exceeded limit/);
    });

    test("should handle the exact boundary case at 128KB", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<Record<string, string>>();

      // Create data that gets us very close to 128KB
      // Account for JSON overhead (quotes, commas, braces)
      const exactData = createLargeData(128 * 1024 - 100); // Slightly under 128KB to account for JSON structure

      // This should work (just under limit)
      expect(() => {
        liveObject.set("almostFull", exactData);
      }).not.toThrow();

      // Now try to add even a tiny bit more
      expect(() => {
        liveObject.set("overflow", "x".repeat(200)); // Small amount that pushes over
      }).toThrow(/LiveObject size exceeded limit/);
    });

    test("should allow many small properties when total stays under limit", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<Record<string, string>>();

      // Add many tiny properties that together stay under 128KB
      const tinyData = createLargeData(1024); // 1KB each

      // Add 100 properties of 1KB each = 100KB total (well under limit)
      for (let i = 0; i < 100; i++) {
        expect(() => {
          liveObject.set(`tiny${i}`, tinyData);
        }).not.toThrow();
      }

      // Should still have room for more
      expect(() => {
        liveObject.set("moreTiny", tinyData);
      }).not.toThrow();
    });

    test("should handle performance optimization boundary correctly", () => {
      // Enable LiveObject.detectLargeObjects property
      LiveObject.detectLargeObjects = true;

      const liveObject = new LiveObject<Record<string, string>>();

      // Create data that when multiplied by 4 would exceed limit, but actual size is under
      // JSON with lots of ASCII chars: string length * 4 > 128KB, but actual UTF-8 bytes < 128KB
      const asciiData = "a".repeat(33000); // 33KB of ASCII (when multiplied by 4 = 132KB > 128KB)

      // This should NOT throw because actual UTF-8 encoding is much smaller than the upper bound
      expect(() => {
        liveObject.set("asciiTest", asciiData);
      }).not.toThrow();

      // But if we have actual large data that exceeds the limit, it should throw
      const reallyLargeData = createLargeData(140 * 1024); // 140KB
      expect(() => {
        liveObject.set("reallyLarge", reallyLargeData);
      }).toThrow(/LiveObject size exceeded limit/);
    });
  });
});
