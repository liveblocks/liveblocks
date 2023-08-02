import { objectUpdate } from "../../__tests__/_updatesUtils";
import {
  createSerializedList,
  createSerializedObject,
  prepareDisconnectedStorageUpdateTest,
  prepareIsolatedStorageTest,
  prepareStorageTest,
  replaceRemoteStorageAndReconnect,
} from "../../__tests__/_utils";
import { waitUntilStorageUpdate } from "../../__tests__/_waitUtils";
import { Permission } from "../../protocol/AuthToken";
import { OpCode } from "../../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../../protocol/SerializedCrdt";
import { CrdtType } from "../../protocol/SerializedCrdt";
import { LiveList } from "../LiveList";
import { LiveObject } from "../LiveObject";

describe("LiveObject", () => {
  describe("roomId", () => {
    it("should be null for orphan", () => {
      expect(new LiveObject().roomId).toBeNull();
    });

    it("should be the associated room id if attached", async () => {
      const { root } = await prepareIsolatedStorageTest(
        [createSerializedObject("root", {})],
        1
      );

      expect(root.roomId).toBe("room-id");
    });

    it("should be null after being detached", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedObject("root", {}),
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

  it("update non existing property", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedObject("0:0", {})]
    );

    expectStorage({});

    storage.root.update({ a: 1 });
    expectStorage({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update non existing property with null", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedObject("0:0", {})]
    );

    expectStorage({});

    storage.root.update({ a: null });
    expectStorage({
      a: null,
    });

    assertUndoRedo();
  });

  it("update throws on read-only", async () => {
    const { storage } = await prepareStorageTest(
      [createSerializedObject("0:0", { a: 0 })],
      1,
      [Permission.Read, Permission.PresenceWrite]
    );

    expect(() => storage.root.update({ a: 1 })).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  it("update existing property", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedObject("0:0", { a: 0 })]
    );

    expectStorage({ a: 0 });

    storage.root.update({ a: 1 });
    expectStorage({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update existing property with null", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedObject("0:0", { a: 0 })]
    );

    expectStorage({ a: 0 });

    storage.root.update({ a: null });
    expectStorage({
      a: null,
    });

    assertUndoRedo();
  });

  it("update root", async () => {
    const { storage, expectStorage, assertUndoRedo } = await prepareStorageTest(
      [createSerializedObject("0:0", { a: 0 })]
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

  it("set throws on read-only", async () => {
    const { storage } = await prepareStorageTest(
      [createSerializedObject("0:0", {})],
      1,
      [Permission.Read, Permission.PresenceWrite]
    );

    expect(() => storage.root.set("a", 1)).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  it("update with LiveObject", async () => {
    const { room, storage, expectStorage, operations, assertUndoRedo } =
      await prepareStorageTest<{ child: LiveObject<{ a: number }> | null }>(
        [createSerializedObject("0:0", { child: null })],
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
    expect(room.__internal.undoStack[0]).toEqual([
      {
        type: OpCode.UPDATE_OBJECT,
        id: "0:0",
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
        parentId: "0:0",
        parentKey: "child",
      },
    ]);

    root.set("child", null);

    expectStorage({
      child: null,
    });
    expect(room.__internal.undoStack[1]).toEqual([
      {
        type: OpCode.CREATE_OBJECT,
        id: "1:0",
        data: { a: 0 },
        parentId: "0:0",
        parentKey: "child",
      },
    ]);

    assertUndoRedo();
  });

  it("remove nested grand child record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
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
    expect(room.__internal.nodeCount).toBe(1);

    assertUndoRedo();
  });

  it("remove nested child record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }> | null;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
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
    expect(room.__internal.nodeCount).toBe(1);

    assertUndoRedo();
  });

  it("add nested record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest([createSerializedObject("0:0", {})], 1);

    expectStorage({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    expectStorage({
      child: {
        a: 0,
      },
    });

    expect(room.__internal.nodeCount).toBe(2);

    assertUndoRedo();
  });

  it("replace nested record with update", async () => {
    const { room, storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest([createSerializedObject("0:0", {})], 1);

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

    expect(room.__internal.nodeCount).toBe(2);

    assertUndoRedo();
  });

  it("update nested record", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number }>;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
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

  it("update deeply nested record", async () => {
    const { storage, expectStorage, assertUndoRedo } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{ b: number; grandChild: LiveObject<{ c: number }> }>;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
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
    it("should not ignore history updates if the current op has not been acknowledged", async () => {
      const { room, root, expectUpdates } =
        await prepareDisconnectedStorageUpdateTest<{
          items: LiveObject<{ b?: string; a?: string }>;
        }>([
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: "B" }, "0:0", "items"),
        ]);

      const items = root.get("items");
      room.batch(() => {
        items.set("a", "A");
        items.set("b", "A");
      });

      expect(items.toObject()).toEqual({ a: "A", b: "A" });
      expectUpdates([
        [
          objectUpdate(
            { a: "A", b: "A" },
            { a: { type: "update" }, b: { type: "update" } }
          ),
        ],
      ]);

      room.history.undo();

      expect(items.toObject()).toEqual({ a: "B" });
      expectUpdates([
        [
          objectUpdate(
            { a: "A", b: "A" },
            { a: { type: "update" }, b: { type: "update" } }
          ),
        ],
        [
          objectUpdate<{ a?: string; b?: string }>(
            { a: "B" },
            { a: { type: "update" }, b: { type: "delete" } }
          ),
        ],
      ]);
    });

    describe("should ignore incoming updates if the current op has not been acknowledged", () => {
      test("when value is not a crdt", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ a: number }>(
            [createSerializedObject("0:0", { a: 0 })],
            1
          );

        expectStorage({ a: 0 });

        root.set("a", 1);

        expectStorage({ a: 1 });

        applyRemoteOperations([
          {
            type: OpCode.UPDATE_OBJECT,
            data: { a: 2 },
            id: "0:0",
            opId: "external",
          },
        ]);

        expectStorage({ a: 1 });
      });

      it("when value is a LiveObject", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{
            a: LiveObject<{ subA: number }>;
          }>(
            [
              createSerializedObject("0:0", {}),
              createSerializedObject("0:1", { subA: 0 }, "0:0", "a"),
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
            parentId: "0:0",
            opId: "external",
          },
        ]);

        expectStorage({ a: { subA: 1 } });
      });

      it("when value is a LiveList with LiveObjects", async () => {
        const { root, expectStorage, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{
            a: LiveList<LiveObject<{ b: number }>>;
          }>(
            [
              createSerializedObject("0:0", {}),
              createSerializedList("0:1", "0:0", "a"),
            ],
            1
          );

        expectStorage({ a: [] });

        const newList = new LiveList<LiveObject<{ b: number }>>();
        newList.push(new LiveObject({ b: 1 }));
        root.set("a", newList);

        expectStorage({ a: [{ b: 1 }] });

        applyRemoteOperations([
          {
            type: OpCode.CREATE_LIST,
            id: "2:0",
            parentKey: "a",
            parentId: "0:0",
            opId: "external",
          },
        ]);

        expectStorage({ a: [{ b: 1 }] });
      });
    });
  });

  describe("delete", () => {
    it("throws on read-only", async () => {
      const { storage } = await prepareStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        [
          createSerializedObject("0:0", { a: 1 }),
          createSerializedObject("0:1", { b: 2 }, "0:0", "child"),
        ],
        1,
        [Permission.Read, Permission.PresenceWrite]
      );

      expect(() => storage.root.get("child").delete("a")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    it("detached", () => {
      const liveObject = new LiveObject({ a: 0 });
      liveObject.delete("a");
      expect(liveObject.get("a")).toBe(undefined);
    });

    it("should delete property from the object", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          a?: number;
        }>([createSerializedObject("0:0", { a: 0 })]);
      expectStorage({ a: 0 });

      storage.root.delete("a");
      expectStorage({});

      assertUndoRedo();
    });

    it("should delete nested crdt", async () => {
      const { storage, expectStorage, assertUndoRedo } =
        await prepareStorageTest<{
          child?: LiveObject<{ a: number }>;
        }>([
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
        ]);

      expectStorage({ child: { a: 0 } });

      storage.root.delete("child");
      expectStorage({});

      assertUndoRedo();
    });

    it("should not notify if property does not exist", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedObject("0:0", {})]);

      const callback = jest.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("should notify if property has been deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedObject("0:0", { a: 1 })]);

      const callback = jest.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyDeleteObjectKey", () => {
    it("should not notify if property does not exist", async () => {
      const { room, root, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ a?: number }>([
          createSerializedObject("0:0", {}),
        ]);

      const callback = jest.fn();
      room.subscribe(root, callback);

      applyRemoteOperations([
        { type: OpCode.DELETE_OBJECT_KEY, id: "0:0", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("should notify if property has been deleted", async () => {
      const { room, root, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{ a?: number }>([
          createSerializedObject("0:0", { a: 1 }),
        ]);

      const callback = jest.fn();
      room.subscribe(root, callback);

      applyRemoteOperations([
        { type: OpCode.DELETE_OBJECT_KEY, id: "0:0", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { room, storage } = await prepareStorageTest<{ a: number }>(
        [createSerializedObject("0:0", { a: 0 })],
        1
      );

      const callback = jest.fn();

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
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
          createSerializedObject("0:2", { a: 0 }, "0:0", "child2"),
        ],
        1
      );

      const callback = jest.fn();

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
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
          createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
        ],
        1
      );

      const callback = jest.fn();

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
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
            createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
          ],
          1
        );

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);

      applyRemoteOperations([
        {
          type: OpCode.UPDATE_OBJECT,
          data: { b: 1 },
          id: "0:2",
          opId: "external",
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
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
            createSerializedObject("0:2", { b: 0 }, "0:1", "subchild"),
          ],
          1
        );

      const callback = jest.fn();

      const root = storage.root;

      const subchild = root.get("child").get("subchild");

      const unsubscribe = room.subscribe(subchild, callback);

      applyRemoteOperations([
        {
          type: OpCode.UPDATE_OBJECT,
          data: { a: 1 },
          id: "0:1",
          opId: "external1",
        },
        {
          type: OpCode.UPDATE_OBJECT,
          data: { b: 1 },
          id: "0:2",
          opId: "external2",
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
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 0, b: 0 }, "0:0", "child"),
          ],
          1
        );

      const callback = jest.fn();

      const root = storage.root;

      const unsubscribe = room.subscribe(root, callback, { isDeep: true });

      applyRemoteOperations([
        {
          type: OpCode.DELETE_OBJECT_KEY,
          key: "a",
          id: "0:1",
          opId: "external",
        },
      ]);

      root.get("child").delete("b");

      unsubscribe();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { a: { type: "delete" } },
        },
      ]);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child"),
          updates: { b: { type: "delete" } },
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
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 1 }, "0:0", "obj"),
          ],
          1
        );

      const rootDeepCallback = jest.fn();
      const liveObjectCallback = jest.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            data: { a: 2 },
            parentId: "0:0",
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
            createSerializedObject("0:0", {}),
            createSerializedObject("0:1", { a: 1 }, "0:0", "obj"),
          ],
          1
        );

      const rootDeepCallback = jest.fn();
      const liveObjectCallback = jest.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      const newInitStorage: IdTuple<SerializedCrdt>[] = [
        ["0:0", { type: CrdtType.OBJECT, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.OBJECT,
            data: { a: 1 },
            parentId: "0:0",
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
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      expectStorage({ a: 0 });
      root.set("a", 1);
      expectStorage({ a: 1 });

      const callback = jest.fn();
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
          createSerializedObject("0:0", {}),
          createSerializedObject("0:1", {}, "0:0", "obj"),
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
            opId: "1:0",
            parentId: "0:1",
            parentKey: "b",
            type: OpCode.CREATE_OBJECT,
          },
        ],
      });
    });
  });
});
