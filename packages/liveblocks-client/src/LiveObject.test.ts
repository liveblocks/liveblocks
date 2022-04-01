import { LiveObject } from "./LiveObject";
import {
  prepareStorageTest,
  createSerializedObject,
  prepareIsolatedStorageTest,
  reconnect,
  createSerializedList,
} from "../test/utils";
import {
  CrdtType,
  OpType,
  SerializedCrdtWithId,
  WebsocketCloseCodes,
} from "./live";
import { LiveList } from ".";

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
    const { storage, assert, assertUndoRedo } = await prepareStorageTest([
      createSerializedObject("0:0", {}),
    ]);

    assert({});

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update non existing property with null", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest([
      createSerializedObject("0:0", {}),
    ]);

    assert({});

    storage.root.update({ a: null });
    assert({
      a: null,
    });

    assertUndoRedo();
  });

  it("update existing property", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest([
      createSerializedObject("0:0", { a: 0 }),
    ]);

    assert({ a: 0 });

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update existing property with null", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest([
      createSerializedObject("0:0", { a: 0 }),
    ]);

    assert({ a: 0 });

    storage.root.update({ a: null });
    assert({
      a: null,
    });

    assertUndoRedo();
  });

  it("update root", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest([
      createSerializedObject("0:0", { a: 0 }),
    ]);

    assert({
      a: 0,
    });

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    storage.root.update({ b: 1 });
    assert({
      a: 1,
      b: 1,
    });

    assertUndoRedo();
  });

  it("update with LiveObject", async () => {
    const { storage, assert, operations, assertUndoRedo, getUndoStack } =
      await prepareStorageTest<{
        child: LiveObject<{ a: number }> | null;
      }>([createSerializedObject("0:0", { child: null })], 1);

    const root = storage.root;

    assert({
      child: null,
    });

    root.set("child", new LiveObject({ a: 0 }));

    assert({
      child: {
        a: 0,
      },
    });
    expect(getUndoStack()[0]).toEqual([
      {
        type: OpType.UpdateObject,
        id: "0:0",
        data: {
          child: null,
        },
      },
    ]);

    expect(operations.length).toEqual(1);
    expect(operations).toEqual([
      {
        type: OpType.CreateObject,
        id: "1:0",
        opId: "1:1",
        data: { a: 0 },
        parentId: "0:0",
        parentKey: "child",
      },
    ]);

    root.set("child", null);

    assert({
      child: null,
    });
    expect(getUndoStack()[1]).toEqual([
      {
        type: OpType.CreateObject,
        id: "1:0",
        data: { a: 0 },
        parentId: "0:0",
        parentKey: "child",
      },
    ]);

    assertUndoRedo();
  });

  it("remove nested grand child record with update", async () => {
    const { storage, assert, assertUndoRedo, getItemsCount } =
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

    assert({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 0,
        },
      },
    });

    storage.root.update({ child: null });

    assert({
      a: 0,
      child: null,
    });
    expect(getItemsCount()).toBe(1);

    assertUndoRedo();
  });

  it("remove nested child record with update", async () => {
    const { storage, assert, assertUndoRedo, getItemsCount } =
      await prepareStorageTest<{
        a: number;
        child: LiveObject<{
          b: number;
        }> | null;
      }>([
        createSerializedObject("0:0", { a: 0 }),
        createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
      ]);

    assert({
      a: 0,
      child: {
        b: 0,
      },
    });

    storage.root.update({ child: null });

    assert({
      a: 0,
      child: null,
    });
    expect(getItemsCount()).toBe(1);

    assertUndoRedo();
  });

  it("add nested record with update", async () => {
    const { storage, assert, assertUndoRedo, getItemsCount } =
      await prepareStorageTest([createSerializedObject("0:0", {})], 1);

    assert({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    assert({
      child: {
        a: 0,
      },
    });

    expect(getItemsCount()).toBe(2);

    assertUndoRedo();
  });

  it("replace nested record with update", async () => {
    const { storage, assert, assertUndoRedo, getItemsCount } =
      await prepareStorageTest([createSerializedObject("0:0", {})], 1);

    assert({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    assert({
      child: {
        a: 0,
      },
    });

    storage.root.update({
      child: new LiveObject({ a: 1 }),
    });

    assert({
      child: {
        a: 1,
      },
    });

    expect(getItemsCount()).toBe(2);

    assertUndoRedo();
  });

  it("update nested record", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{ b: number }>;
    }>([
      createSerializedObject("0:0", { a: 0 }),
      createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
    ]);

    const root = storage.root;
    const child = root.toObject().child;

    assert({
      a: 0,
      child: {
        b: 0,
      },
    });

    child.update({ b: 1 });
    assert({
      a: 0,
      child: {
        b: 1,
      },
    });

    assertUndoRedo();
  });

  it("update deeply nested record", async () => {
    const { storage, assert, assertUndoRedo } = await prepareStorageTest<{
      a: number;
      child: LiveObject<{ b: number; grandChild: LiveObject<{ c: number }> }>;
    }>([
      createSerializedObject("0:0", { a: 0 }),
      createSerializedObject("0:1", { b: 0 }, "0:0", "child"),
      createSerializedObject("0:2", { c: 0 }, "0:1", "grandChild"),
    ]);

    assert({
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

    assert({
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
    describe("should ignore incoming updates if current op has not been acknowledged", () => {
      test("when value is not a crdt", async () => {
        const { root, assert, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ a: number }>(
            [createSerializedObject("0:0", { a: 0 })],
            1
          );

        assert({ a: 0 });

        root.set("a", 1);

        assert({ a: 1 });

        applyRemoteOperations([
          {
            type: OpType.UpdateObject,
            data: { a: 2 },
            id: "0:0",
            opId: "external",
          },
        ]);

        assert({ a: 1 });
      });

      it("when value is a LiveObject", async () => {
        const { root, assert, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{ a: LiveObject<{ subA: number }> }>(
            [
              createSerializedObject("0:0", {}),
              createSerializedObject("0:1", { subA: 0 }, "0:0", "a"),
            ],
            1
          );

        assert({ a: { subA: 0 } });

        root.set("a", new LiveObject({ subA: 1 }));

        assert({ a: { subA: 1 } });

        applyRemoteOperations([
          {
            type: OpType.CreateObject,
            data: { subA: 2 },
            id: "2:0",
            parentKey: "a",
            parentId: "0:0",
            opId: "external",
          },
        ]);

        assert({ a: { subA: 1 } });
      });

      it("when value is a LiveList with LiveObjects", async () => {
        const { root, assert, applyRemoteOperations } =
          await prepareIsolatedStorageTest<{
            a: LiveList<LiveObject<{ b: number }>>;
          }>(
            [
              createSerializedObject("0:0", {}),
              createSerializedList("0:1", "0:0", "a"),
            ],
            1
          );

        assert({ a: [] });

        const newList = new LiveList<LiveObject<{ b: number }>>();
        newList.push(new LiveObject({ b: 1 }));
        root.set("a", newList);

        assert({ a: [{ b: 1 }] });

        applyRemoteOperations([
          {
            type: OpType.CreateList,
            id: "2:0",
            parentKey: "a",
            parentId: "0:0",
            opId: "external",
          },
        ]);

        assert({ a: [{ b: 1 }] });
      });
    });
  });

  describe("delete", () => {
    it("detached", () => {
      const liveObject = new LiveObject({ a: 0 });
      liveObject.delete("a");
      expect(liveObject.get("a")).toBe(undefined);
    });

    it("should delete property from the object", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<{
        a?: number;
      }>([createSerializedObject("0:0", { a: 0 })]);
      assert({ a: 0 });

      storage.root.delete("a");
      assert({});

      assertUndoRedo();
    });

    it("should delete nested crdt", async () => {
      const { storage, assert, assertUndoRedo } = await prepareStorageTest<{
        child?: LiveObject<{ a: number }>;
      }>([
        createSerializedObject("0:0", {}),
        createSerializedObject("0:1", { a: 0 }, "0:0", "child"),
      ]);

      assert({ child: { a: 0 } });

      storage.root.delete("child");
      assert({});

      assertUndoRedo();
    });

    it("should not notify if property does not exist", async () => {
      const { root, subscribe } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedObject("0:0", {})]);

      const callback = jest.fn();
      subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("should notify if property has been deleted", async () => {
      const { root, subscribe } = await prepareIsolatedStorageTest<{
        a?: number;
      }>([createSerializedObject("0:0", { a: 1 })]);

      const callback = jest.fn();
      subscribe(root, callback);

      root.delete("a");

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("applyDeleteObjectKey", () => {
    it("should not notify if property does not exist", async () => {
      const { root, subscribe, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{
          a?: number;
        }>([createSerializedObject("0:0", {})]);

      const callback = jest.fn();
      subscribe(root, callback);

      applyRemoteOperations([
        { type: OpType.DeleteObjectKey, id: "0:0", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(0);
    });

    it("should notify if property has been deleted", async () => {
      const { root, subscribe, applyRemoteOperations } =
        await prepareIsolatedStorageTest<{
          a?: number;
        }>([createSerializedObject("0:0", { a: 1 })]);

      const callback = jest.fn();
      subscribe(root, callback);

      applyRemoteOperations([
        { type: OpType.DeleteObjectKey, id: "0:0", key: "a" },
      ]);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("subscriptions", () => {
    test("simple action", async () => {
      const { storage, subscribe } = await prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      const callback = jest.fn();

      const root = storage.root;

      subscribe(root, callback);

      root.set("a", 1);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(storage.root);
    });

    test("subscribe multiple actions", async () => {
      const { storage, subscribe } = await prepareStorageTest<{
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

      const unsubscribe = subscribe(root.get("child"), callback);

      root.get("child").set("a", 1);

      root.get("child2").set("a", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root.get("child"));
    });

    test("deep subscribe", async () => {
      const { storage, subscribe } = await prepareStorageTest<{
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

      const unsubscribe = subscribe(root, callback, { isDeep: true });

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
      const { storage, subscribe, applyRemoteOperations } =
        await prepareStorageTest<{
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

      const unsubscribe = subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);

      applyRemoteOperations([
        {
          type: OpType.UpdateObject,
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

    test("deep subscribe remote and local operation - delete object key", async () => {
      const { storage, subscribe, applyRemoteOperations } =
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

      const unsubscribe = subscribe(root, callback, { isDeep: true });

      applyRemoteOperations([
        {
          type: OpType.DeleteObjectKey,
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
      const { assert, machine, root } = await prepareIsolatedStorageTest<{
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

      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(root.get("obj"), liveObjectCallback);

      assert({ obj: { a: 1 } });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.Object,
            data: { a: 2 },
            parentId: "0:0",
            parentKey: "obj",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
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
      const { assert, machine, root } = await prepareIsolatedStorageTest<{
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

      machine.subscribe(root, rootDeepCallback, { isDeep: true });
      machine.subscribe(root.get("obj"), liveObjectCallback);

      assert({ obj: { a: 1 } });

      machine.onClose(
        new CloseEvent("close", {
          code: WebsocketCloseCodes.CLOSE_ABNORMAL,
          wasClean: false,
        })
      );

      const newInitStorage: SerializedCrdtWithId[] = [
        ["0:0", { type: CrdtType.Object, data: {} }],
        [
          "0:1",
          {
            type: CrdtType.Object,
            data: { a: 1 },
            parentId: "0:0",
            parentKey: "obj",
          },
        ],
        [
          "0:2",
          {
            type: CrdtType.Object,
            data: { b: 1 },
            parentId: "0:1",
            parentKey: "subObj",
          },
        ],
      ];

      reconnect(machine, 3, newInitStorage);

      assert({
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
      const { root, assert, subscribe, undo } =
        await prepareIsolatedStorageTest<{ a: number }>(
          [createSerializedObject("0:0", { a: 0 })],
          1
        );

      assert({ a: 0 });
      root.set("a", 1);
      assert({ a: 1 });

      const callback = jest.fn();
      subscribe(root, callback, { isDeep: true });

      undo();
      assert({ a: 0 });

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

      const applyResult = obj._detachChild(secondItem!);

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
            type: OpType.CreateObject,
          },
        ],
      });
    });
  });
});
