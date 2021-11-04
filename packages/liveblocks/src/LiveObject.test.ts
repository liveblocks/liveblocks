import { LiveObject } from "./LiveObject";
import {
  prepareStorageTest,
  createSerializedObject,
  docToJson,
} from "../test/utils";
import { Doc } from "./doc";
import { OpType } from "./live";

describe("LiveObject", () => {
  it("update non existing property", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest([
      createSerializedObject("0:0", {}),
    ]);

    assert({});

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update non existing property with null", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest([
      createSerializedObject("0:0", {}),
    ]);

    assert({});

    storage.root.update({ a: null });
    assert({
      a: null,
    });

    assertUndoRedo();
  });

  it("update existing property", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest([
      createSerializedObject("0:0", { a: 0 }),
    ]);

    assert({ a: 0 });

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    assertUndoRedo();
  });

  it("update existing property with null", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest([
      createSerializedObject("0:0", { a: 0 }),
    ]);

    assert({ a: 0 });

    storage.root.update({ a: null });
    assert({
      a: null,
    });

    assertUndoRedo();
  });

  it("update root", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest([
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

  it("update with LiveObject", () => {
    const { storage, assert, operations, assertUndoRedo } = prepareStorageTest<{
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
    expect(storage.undoStack[0]).toEqual([
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
        data: { a: 0 },
        parentId: "0:0",
        parentKey: "child",
      },
    ]);

    root.set("child", null);

    assert({
      child: null,
    });
    expect(storage.undoStack[1]).toEqual([
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

  it("remove nested child record with update", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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
    expect(storage.count()).toBe(1);

    assertUndoRedo();
  });

  it("remove nested child record with update", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest<{
      a: number;
      child: LiveObject<{
        b: number;
        grandChild: LiveObject<{ c: number }>;
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
    expect(storage.count()).toBe(1);

    assertUndoRedo();
  });

  it("add nested record with update", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest(
      [createSerializedObject("0:0", {})],
      1
    );

    assert({});

    storage.root.update({
      child: new LiveObject({ a: 0 }),
    });

    assert({
      child: {
        a: 0,
      },
    });

    expect(storage.count()).toBe(2);

    assertUndoRedo();
  });

  it("replace nested record with update", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest(
      [createSerializedObject("0:0", {})],
      1
    );

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

    expect(storage.count()).toBe(2);

    assertUndoRedo();
  });

  it("update nested record", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

  it("update deeply nested record", () => {
    const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

  it("should ignore incoming updates if current op has not been acknowledged", () => {
    const storage = Doc.load<{ a: number }>(
      [createSerializedObject("0:0", { a: 0 })],
      1
    );

    expect(docToJson(storage)).toEqual({ a: 0 });

    storage.root.set("a", 1);

    expect(docToJson(storage)).toEqual({ a: 1 });

    storage.applyRemoteOperations([
      {
        type: OpType.UpdateObject,
        data: { a: 2 },
        id: "0:0",
        opId: "external",
      },
    ]);

    expect(docToJson(storage)).toEqual({ a: 1 });
  });

  describe("subscriptions", () => {
    test("simple action", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
        a: number;
      }>([createSerializedObject("0:0", { a: 0 })], 1);

      const callback = jest.fn();

      const root = storage.root;

      storage.subscribe(root, callback);

      root.set("a", 1);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(storage.root);
    });

    test("subscribe multiple actions", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      const unsubscribe = storage.subscribe(root.get("child"), callback);

      root.get("child").set("a", 1);

      root.get("child2").set("a", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(root.get("child"));
    });

    test("deep subscribe", () => {
      const { storage, assert, assertUndoRedo } = prepareStorageTest<{
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

      const unsubscribe = storage.subscribe(root, callback, { isDeep: true });

      root.get("child").set("a", 1);
      root.get("child").get("subchild").set("b", 1);

      unsubscribe();

      root.get("child").set("a", 2);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith([
        { type: "LiveObject", node: root.get("child") },
      ]);
      expect(callback).toHaveBeenCalledWith([
        {
          type: "LiveObject",
          node: root.get("child").get("subchild"),
        },
      ]);
    });
  });
});
