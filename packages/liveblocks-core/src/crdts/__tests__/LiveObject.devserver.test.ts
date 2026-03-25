/**
 * LiveObject tests that run against the real dev server.
 *
 * For edge cases that require precise control over wire-level ops (ack
 * mechanism, internal methods), see LiveObject.mockserver.test.ts.
 */
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from "vitest";

import {
  prepareIsolatedStorageTest,
  prepareStorageTest,
  replaceStorageAndReconnectDevServer,
} from "../../__tests__/_devserver";
import {
  type JsonStorageUpdate,
  objectUpdate,
  serializeUpdateToJson,
} from "../../__tests__/_updatesUtils";
import { kInternal } from "../../internal";
import { LiveList } from "../LiveList";
import { LiveObject } from "../LiveObject";

describe("LiveObject", () => {
  describe("roomId", () => {
    test("should be null for orphan", () => {
      expect(new LiveObject().roomId).toBeNull();
    });

    test("should be the associated room id if attached", async () => {
      const { root, room } = await prepareIsolatedStorageTest();

      expect(root.roomId).toBe(room.id);
    });

    test("should be null after being detached", async () => {
      const { root, room } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: { liveblocksType: "LiveObject", data: { a: 0 } },
        },
      });

      const child = root.get("child");

      expect(child.roomId).toBe(room.id);

      root.set("child", new LiveObject({ a: 1 }));

      expect(child.roomId).toBe(null);
    });
  });

  test("update non existing property", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest({
      liveblocksType: "LiveObject",
      data: {},
    });

    await expectStorage({});

    storage.root.update({ a: 1 });
    await expectStorage({
      a: 1,
    });

    await assertUndoRedo();
  });

  test("update non existing property with null", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest({
      liveblocksType: "LiveObject",
      data: {},
    });

    await expectStorage({});

    storage.root.update({ a: null });
    await expectStorage({
      a: null,
    });

    await assertUndoRedo();
  });

  // TODO: Needs read-only permission support in dev server
  // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
  test.skip("update throws on read-only", async () => {
    const { root } = await prepareIsolatedStorageTest<{ a: number }>(
      { liveblocksType: "LiveObject", data: { a: 0 } },
      { permissions: ["room:read", "room:presence:write"] }
    );

    expect(() => root.update({ a: 1 })).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("update existing property", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{ a: number }>({
      liveblocksType: "LiveObject",
      data: { a: 0 },
    });

    await expectStorage({ a: 0 });

    storage.root.update({ a: 1 });
    await expectStorage({
      a: 1,
    });

    await assertUndoRedo();
  });

  test("update existing property with null", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{ a: number | null }>({
      liveblocksType: "LiveObject",
      data: { a: 0 },
    });

    await expectStorage({ a: 0 });

    storage.root.update({ a: null });
    await expectStorage({
      a: null,
    });

    await assertUndoRedo();
  });

  test("update root", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{ a: number; b?: number }>({
      liveblocksType: "LiveObject",
      data: { a: 0 },
    });

    await expectStorage({
      a: 0,
    });

    storage.root.update({ a: 1 });
    await expectStorage({
      a: 1,
    });

    storage.root.update({ b: 1 });
    await expectStorage({
      a: 1,
      b: 1,
    });

    await assertUndoRedo();
  });

  // TODO: Needs read-only permission support in dev server
  // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
  test.skip("set throws on read-only", async () => {
    const { root } = await prepareIsolatedStorageTest(undefined, {
      permissions: ["room:read", "room:presence:write"],
    });

    expect(() => root.set("a", 1)).toThrow(
      "Cannot write to storage with a read only user, please ensure the user has write permissions"
    );
  });

  test("update with LiveObject", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{
      child: LiveObject<{ a: number }> | null;
    }>({
      liveblocksType: "LiveObject",
      data: { child: null },
    });

    const root = storage.root;

    await expectStorage({
      child: null,
    });

    root.set("child", new LiveObject({ a: 0 }));

    await expectStorage({
      child: {
        a: 0,
      },
    });

    root.set("child", null);

    await expectStorage({
      child: null,
    });

    await assertUndoRedo();
  });

  test("remove nested grand child record with update", async () => {
    const {
      roomA: room,
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{
        b: number;
        grandChild: LiveObject<{ c: number }>;
      }> | null;
    }>({
      liveblocksType: "LiveObject",
      data: {
        a: 0,
        child: {
          liveblocksType: "LiveObject",
          data: {
            b: 0,
            grandChild: { liveblocksType: "LiveObject", data: { c: 0 } },
          },
        },
      },
    });

    await expectStorage({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 0,
        },
      },
    });

    storage.root.update({ child: null });

    await expectStorage({
      a: 0,
      child: null,
    });
    expect(room[kInternal].nodeCount).toBe(1);

    await assertUndoRedo();
  });

  test("remove nested child record with update", async () => {
    const {
      roomA: room,
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{ b: number }> | null;
    }>({
      liveblocksType: "LiveObject",
      data: {
        a: 0,
        child: { liveblocksType: "LiveObject", data: { b: 0 } },
      },
    });

    await expectStorage({
      a: 0,
      child: {
        b: 0,
      },
    });

    storage.root.update({ child: null });

    await expectStorage({
      a: 0,
      child: null,
    });
    expect(room[kInternal].nodeCount).toBe(1);

    await assertUndoRedo();
  });

  test("add nested record with update", async () => {
    const {
      roomA: room,
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest({
      liveblocksType: "LiveObject",
      data: {},
    });

    await expectStorage({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    await expectStorage({
      child: {
        a: 0,
      },
    });

    expect(room[kInternal].nodeCount).toBe(2);

    await assertUndoRedo();
  });

  test("replace nested record with update", async () => {
    const {
      roomA: room,
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest({
      liveblocksType: "LiveObject",
      data: {},
    });

    await expectStorage({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    await expectStorage({
      child: {
        a: 0,
      },
    });

    storage.root.update({
      child: new LiveObject({ a: 1 }),
    });

    await expectStorage({
      child: {
        a: 1,
      },
    });

    expect(room[kInternal].nodeCount).toBe(2);

    await assertUndoRedo();
  });

  test("update nested record", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{ b: number }>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        a: 0,
        child: { liveblocksType: "LiveObject", data: { b: 0 } },
      },
    });

    const root = storage.root;
    const child = root.toObject().child;

    await expectStorage({
      a: 0,
      child: {
        b: 0,
      },
    });

    child.update({ b: 1 });
    await expectStorage({
      a: 0,
      child: {
        b: 1,
      },
    });

    await assertUndoRedo();
  });

  test("update deeply nested record", async () => {
    const {
      storageA: storage,
      expectStorage,
      assertUndoRedo,
    } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{ b: number; grandChild: LiveObject<{ c: number }> }>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        a: 0,
        child: {
          liveblocksType: "LiveObject",
          data: {
            b: 0,
            grandChild: { liveblocksType: "LiveObject", data: { c: 0 } },
          },
        },
      },
    });

    await expectStorage({
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

    await expectStorage({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 1,
        },
      },
    });

    await assertUndoRedo();
  });

  describe("acknowledge mechanism", () => {
    test("should not ignore history updates if the current op has not been acknowledged", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        items: LiveObject<{ b?: string; a?: string }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: {
            liveblocksType: "LiveObject",
            data: { a: "initial" },
          },
        },
      });

      const receivedUpdates: JsonStorageUpdate[][] = [];
      onTestFinished(
        room.subscribe(
          root,
          (updates) => receivedUpdates.push(updates.map(serializeUpdateToJson)),
          { isDeep: true }
        )
      );

      const items = root.get("items");
      room.batch(() => {
        items.set("a", "A");
        items.set("b", "B");
      });

      expect(items.toObject()).toEqual({ a: "A", b: "B" });
      expect(receivedUpdates).toEqual([
        [
          objectUpdate(
            { a: "A", b: "B" },
            { a: { type: "update" }, b: { type: "update" } }
          ),
        ],
      ]);

      room.history.undo();

      expect(items.toObject()).toEqual({ a: "initial" });
      expect(receivedUpdates).toEqual([
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
  });

  describe("delete", () => {
    // TODO: Needs read-only permission support in dev server
    // See https://linear.app/liveblocks/issue/LB-3528/dev-server-needs-support-for-read-only-rooms
    test.skip("throws on read-only", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number }>;
      }>(
        {
          liveblocksType: "LiveObject",
          data: {
            a: 1,
            child: { liveblocksType: "LiveObject", data: { b: 2 } },
          },
        },
        { permissions: ["room:read", "room:presence:write"] }
      );

      expect(() => root.get("child").delete("a")).toThrow(
        "Cannot write to storage with a read only user, please ensure the user has write permissions"
      );
    });

    test("detached", () => {
      const liveObject = new LiveObject({ a: 0 });
      liveObject.delete("a");
      expect(liveObject.get("a")).toBe(undefined);
    });

    test("should delete property from the object", async () => {
      const {
        storageA: storage,
        expectStorage,
        assertUndoRedo,
      } = await prepareStorageTest<{
        a?: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });
      await expectStorage({ a: 0 });

      storage.root.delete("a");
      await expectStorage({});

      await assertUndoRedo();
    });

    test("should delete nested crdt", async () => {
      const {
        storageA: storage,
        expectStorage,
        assertUndoRedo,
      } = await prepareStorageTest<{
        child?: LiveObject<{ a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: { liveblocksType: "LiveObject", data: { a: 0 } },
        },
      });

      await expectStorage({ child: { a: 0 } });

      storage.root.delete("child");
      await expectStorage({});

      await assertUndoRedo();
    });

    test("should not notify if property does not exist", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>();

      const callback = vi.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(0);
    });

    test("should notify if property has been deleted", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        a?: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      const callback = vi.fn();
      room.subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyDeleteObjectKey", () => {
    // When a remote DELETE_OBJECT_KEY arrives for a key that doesn't exist
    // locally (because this client already deleted it), the subscription
    // callback should NOT fire. We test this by having both clients delete
    // an overlapping key "c" simultaneously:
    //
    //   Start:    { a, b, c } on both clients
    //   Client A: deletes a + c locally
    //   Client B: deletes b + c locally
    //
    // After sync, each client gets 3 notifications (not 4):
    //   - 2 from their own local deletes
    //   - 1 from the other client's non-overlapping delete
    //   - 0 from the other client's overlapping "delete c" (already gone)
    test("should not notify for redundant remote delete", async () => {
      const { roomA, roomB, storageA, storageB } = await prepareStorageTest<{
        a?: number;
        b?: number;
        c?: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1, b: 2, c: 3 },
      });

      const callbackA = vi.fn();
      const callbackB = vi.fn();

      roomA.subscribe(storageA.root, callbackA);
      roomB.subscribe(storageB.root, callbackB);

      // Both clients delete an overlapping key "c" simultaneously
      storageA.root.delete("a");
      storageA.root.delete("c");

      storageB.root.delete("b");
      storageB.root.delete("c");

      // Wait for both clients to fully sync
      await vi.waitUntil(() => storageA.root.get("b") === undefined);
      await vi.waitUntil(() => storageB.root.get("a") === undefined);

      // Each client: 2 local deletes + 1 remote delete = 3
      // The redundant remote "delete c" must NOT fire a 4th notification
      expect(callbackA).toHaveBeenCalledTimes(3);
      expect(callbackB).toHaveBeenCalledTimes(3);
    });
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{ a: number }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

      const callback = vi.fn();

      room.subscribe(root, callback);

      root.set("a", 1);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root);
    });

    test("subscribe multiple actions", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number }>;
        child2: LiveObject<{ a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: { liveblocksType: "LiveObject", data: { a: 0 } },
          child2: { liveblocksType: "LiveObject", data: { a: 0 } },
        },
      });

      const callback = vi.fn();

      const unsubscribe = room.subscribe(root.get("child"), callback);

      root.get("child").set("a", 1);

      root.get("child2").set("a", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root.get("child"));
    });

    test("deep subscribe", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        child: LiveObject<{ a: number; subchild: LiveObject<{ b: number }> }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: {
            liveblocksType: "LiveObject",
            data: {
              a: 0,
              subchild: { liveblocksType: "LiveObject", data: { b: 0 } },
            },
          },
        },
      });

      const callback = vi.fn();

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
      const { roomA, storageA, storageB } = await prepareStorageTest<{
        child: LiveObject<{
          a: number;
          subchild: LiveObject<{ b: number }>;
        }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: {
            liveblocksType: "LiveObject",
            data: {
              a: 0,
              subchild: { liveblocksType: "LiveObject", data: { b: 0 } },
            },
          },
        },
      });

      const callback = vi.fn();

      const rootA = storageA.root;

      const unsubscribe = roomA.subscribe(rootA, callback, { isDeep: true });

      rootA.get("child").set("a", 1);

      // Remote change via client B
      storageB.root.get("child").get("subchild").set("b", 1);
      await vi.waitUntil(
        () => rootA.get("child").get("subchild").get("b") === 1
      );

      unsubscribe();

      rootA.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: rootA.get("child"),
          updates: { a: { type: "update" } },
        },
      ]);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: rootA.get("child").get("subchild"),
          updates: { b: { type: "update" } },
        },
      ]);
    });

    test("subscribe subchild remote operation", async () => {
      const { roomA, storageA, storageB } = await prepareStorageTest<{
        child: LiveObject<{
          a: number;
          subchild: LiveObject<{ b: number }>;
        }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: {
            liveblocksType: "LiveObject",
            data: {
              a: 0,
              subchild: { liveblocksType: "LiveObject", data: { b: 0 } },
            },
          },
        },
      });

      const callback = vi.fn();

      const rootA = storageA.root;

      const subchild = rootA.get("child").get("subchild");

      const unsubscribe = roomA.subscribe(subchild, callback);

      // Remote changes via client B
      storageB.root.get("child").set("a", 1);
      storageB.root.get("child").get("subchild").set("b", 1);
      await vi.waitUntil(
        () => rootA.get("child").get("subchild").get("b") === 1
      );

      unsubscribe();

      rootA.get("child").get("subchild").set("b", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(rootA.get("child").get("subchild"));
    });

    test("deep subscribe remote and local operation - delete object key", async () => {
      const { roomA, storageA, storageB } = await prepareStorageTest<{
        child: LiveObject<{ a?: number; b?: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          child: {
            liveblocksType: "LiveObject",
            data: { a: -1, b: -2 },
          },
        },
      });

      const callback = vi.fn();

      const rootA = storageA.root;

      const unsubscribe = roomA.subscribe(rootA, callback, { isDeep: true });

      // Remote deletion via client B
      storageB.root.get("child").delete("a");
      await vi.waitUntil(() => rootA.get("child").get("a") === undefined);

      // Local deletion
      rootA.get("child").delete("b");

      unsubscribe();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, [
        {
          type: "LiveObject",
          node: rootA.get("child"),
          updates: { a: { type: "delete", deletedItem: -1 } },
        },
      ]);
      expect(callback).toHaveBeenNthCalledWith(2, [
        {
          type: "LiveObject",
          node: rootA.get("child"),
          updates: { b: { type: "delete", deletedItem: -2 } },
        },
      ]);
    });
  });

  // TODO: Needs atomic storage replacement + reconnect support in dev server
  // See https://linear.app/liveblocks/issue/LB-3529/dev-server-needs-support-for-a-crash-replace-storage-atomic-feature
  //
  // The dev server needs a new endpoint that atomically replaces a room's
  // storage and disconnects all clients, forcing them to reconnect and
  // reconcile the diff. Until then, these tests are skipped.
  describe("reconnect with remote changes and subscribe", () => {
    test.skip("LiveObject updated", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        obj: LiveObject<{ a: number }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          obj: { liveblocksType: "LiveObject", data: { a: 1 } },
        },
      });

      const rootDeepCallback = vi.fn();
      const liveObjectCallback = vi.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      await replaceStorageAndReconnectDevServer(room.id, {
        liveblocksType: "LiveObject",
        data: {
          obj: { liveblocksType: "LiveObject", data: { a: 2 } },
        },
      });

      await vi.waitUntil(() => root.get("obj").get("a") === 2);
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

    test.skip("LiveObject updated nested", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        obj: LiveObject<{ a: number; subObj?: LiveObject<{ b: number }> }>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          obj: { liveblocksType: "LiveObject", data: { a: 1 } },
        },
      });

      const rootDeepCallback = vi.fn();
      const liveObjectCallback = vi.fn();

      room.subscribe(root, rootDeepCallback, { isDeep: true });
      room.subscribe(root.get("obj"), liveObjectCallback);

      expectStorage({ obj: { a: 1 } });

      await replaceStorageAndReconnectDevServer(room.id, {
        liveblocksType: "LiveObject",
        data: {
          obj: {
            liveblocksType: "LiveObject",
            data: {
              a: 1,
              subObj: { liveblocksType: "LiveObject", data: { b: 1 } },
            },
          },
        },
      });

      await vi.waitUntil(() => root.get("obj").get("subObj") !== undefined);
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
      }>({
        liveblocksType: "LiveObject",
        data: { a: 0 },
      });

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

  describe("setLocal", () => {
    test("setLocal value is visible via get, toObject, and toImmutable", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        a: number;
        b?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      root.setLocal("b", "local");

      expect(root.get("b")).toBe("local");
      expect(root.toObject()).toEqual({ a: 1, b: "local" });
      expect(root.toImmutable()).toEqual({ a: 1, b: "local" });
    });

    test("setLocal does not sync to other clients", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        b?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("b", "local");

      // Client A sees local value
      expect(storageA.root.get("b")).toBe("local");

      // Client B does not see local value (wait a bit to confirm nothing syncs)
      await vi.waitFor(() => {
        expect(storageB.root.toImmutable()).toEqual({ a: 1 });
      });
    });

    test("setLocal value is not synced but set value is", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
        bar?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("foo", "local-only");
      storageA.root.set("bar", "synced");

      // Client A sees both
      expect(storageA.root.get("foo")).toBe("local-only");
      expect(storageA.root.get("bar")).toBe("synced");

      // Client B only sees bar, not foo
      await vi.waitFor(() => {
        expect(storageB.root.toImmutable()).toEqual({ a: 1, bar: "synced" });
      });
    });

    test("client A sees local + remote values, client B sees only remote", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
        bar?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("foo", "local-only");
      storageB.root.set("bar", "from-B");

      // Wait for B's change to sync
      await vi.waitFor(() => {
        expect(storageB.root.toImmutable()).toEqual({ a: 1, bar: "from-B" });
      });

      // Wait for A to receive B's synced change
      await vi.waitFor(() => {
        expect(storageA.root.get("bar")).toBe("from-B");
      });

      // Client A sees both foo (local) and bar (synced from B)
      expect(storageA.root.get("foo")).toBe("local-only");

      // Client B sees only bar
      expect(storageB.root.get("foo")).toBeUndefined();
    });

    test("calling .set() on a local-only key clears the local overlay", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("foo", "local-only");
      expect(storageA.root.get("foo")).toBe("local-only");

      // Now set it as a synced value
      storageA.root.set("foo", "synced");
      expect(storageA.root.get("foo")).toBe("synced");

      // Client B should now see it too
      await vi.waitFor(() => {
        expect(storageB.root.get("foo")).toBe("synced");
      });
    });

    test("remote .set() on a local-only key clears the local overlay", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("foo", "local-only");
      expect(storageA.root.get("foo")).toBe("local-only");

      // Client B sets the same key as synced
      storageB.root.set("foo", "from-B");

      // Client A should see B's value (remote wins)
      await vi.waitFor(() => {
        expect(storageA.root.get("foo")).toBe("from-B");
      });
    });

    test("clone preserves local-only properties", async () => {
      const { root } = await prepareIsolatedStorageTest<{
        a: number;
        b?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      root.setLocal("b", "local-only");
      const cloned = root.clone();

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toBe("local-only");
      expect(cloned.toImmutable()).toEqual({ a: 1, b: "local-only" });
    });

    test("clone preserves local-only properties on detached LiveObject", () => {
      const obj = new LiveObject<{ a: number; b?: string }>({ a: 1 });
      obj.setLocal("b", "local-only");
      const cloned = obj.clone();

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toBe("local-only");
      expect(cloned.toImmutable()).toEqual({ a: 1, b: "local-only" });
    });

    test("clone with local props injected into sibling: both have local prop on A, neither on B", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        child1?: LiveObject<{ x: number; y?: string }>;
        child2?: LiveObject<{ x: number; y?: string }>;
      }>({
        liveblocksType: "LiveObject",
        data: {},
      });

      const obj = new LiveObject<{ x: number; y?: string }>({ x: 1 });
      storageA.root.set("child1", obj);
      obj.setLocal("y", "local-only");

      const cloned = obj.clone();
      storageA.root.set("child2", cloned);

      // Client A: both children have the local prop
      expect(storageA.root.get("child1")!.get("y")).toBe("local-only");
      expect(storageA.root.get("child2")!.get("y")).toBe("local-only");

      // Client B: neither child has the local prop
      await vi.waitFor(() => {
        expect(storageB.root.get("child1")!.get("x")).toBe(1);
        expect(storageB.root.get("child2")!.get("x")).toBe(1);
      });
      expect(storageB.root.get("child1")!.get("y")).toBeUndefined();
      expect(storageB.root.get("child2")!.get("y")).toBeUndefined();
    });

    test("setLocal on an already-synced key deletes the synced value from other clients", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      // First, sync a value
      storageA.root.set("foo", "synced");
      await vi.waitFor(() => {
        expect(storageB.root.get("foo")).toBe("synced");
      });

      // Now override with setLocal
      storageA.root.setLocal("foo", "local-only");

      // Client A sees the local value
      expect(storageA.root.get("foo")).toBe("local-only");

      // Client B should no longer see "synced" — the key should be deleted
      await vi.waitFor(() => {
        expect(storageB.root.get("foo")).toBeUndefined();
      });
    });

    test("delete on a local-only key removes it without sending ops", async () => {
      const { storageA, storageB } = await prepareStorageTest<{
        a: number;
        foo?: string;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      storageA.root.setLocal("foo", "local-only");
      expect(storageA.root.get("foo")).toBe("local-only");

      storageA.root.delete("foo");
      expect(storageA.root.get("foo")).toBeUndefined();

      // Client B should still not see foo (nothing was synced)
      await vi.waitFor(() => {
        expect(storageB.root.toImmutable()).toEqual({ a: 1 });
      });
    });
  });
});
