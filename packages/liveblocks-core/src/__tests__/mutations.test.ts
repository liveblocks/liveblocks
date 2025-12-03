import { describe, expect, test } from "vitest";

import { createManagedPool, OpSource } from "../crdts/AbstractCrdt";
import { isLiveList } from "../crdts/liveblocks-helpers";
import { LiveList } from "../crdts/LiveList";
import { LiveMap } from "../crdts/LiveMap";
import { LiveObject } from "../crdts/LiveObject";
import type { Lson, LsonObject } from "../crdts/Lson";
import { asPos } from "../lib/position";
import { generateOpsFromJson } from "../mutations";
import type { Op } from "../protocol/Op";
import { isAckOp, OpCode } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import {
  createSerializedList,
  createSerializedMap,
  createSerializedObject,
  createSerializedRegister,
  FIRST_POSITION,
  SECOND_POSITION,
} from "./_utils";

/**
 * Helper function to apply ops to a LiveObject tree.
 * This simulates what happens when ops are applied in a real room.
 */
function applyOpsToTree(root: LiveObject<LsonObject>, ops: Op[]): void {
  // Access protected _pool property for testing purposes
  const pool = (root as any)._pool;
  if (!pool) {
    throw new Error("Root must be attached to a pool");
  }

  // Ensure all ops have opIds
  const opsWithIds = ops.map((op) => {
    if (!isAckOp(op) && !op.opId) {
      return { ...op, opId: pool.generateOpId() };
    }
    return op;
  });

  // Apply ops in order
  for (const op of opsWithIds) {
    if (isAckOp(op)) {
      continue; // Ack ops are no-ops
    }

    switch (op.type) {
      case OpCode.DELETE_OBJECT_KEY:
      case OpCode.UPDATE_OBJECT:
      case OpCode.DELETE_CRDT: {
        const node = pool.nodes.get(op.id);
        if (node) {
          node._apply(op, false);
        }
        break;
      }

      case OpCode.SET_PARENT_KEY: {
        const node = pool.nodes.get(op.id);
        if (
          node &&
          node.parent.type === "HasParent" &&
          isLiveList(node.parent.node)
        ) {
          node.parent.node._setChildKey(
            asPos(op.parentKey),
            node,
            OpSource.REMOTE
          );
        }
        break;
      }

      case OpCode.CREATE_OBJECT:
      case OpCode.CREATE_LIST:
      case OpCode.CREATE_MAP:
      case OpCode.CREATE_REGISTER: {
        if (op.parentId) {
          const parentNode = pool.nodes.get(op.parentId);
          if (parentNode) {
            parentNode._attachChild(op, OpSource.REMOTE);
          }
        }
        break;
      }
    }
  }
}

describe("generateOpsFromJson", () => {
  test("partial nested update preserves LiveObject structure", () => {
    // Initial structure: car with nested engine LiveObject
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}), // root
      createSerializedObject(
        "0:1",
        { displacement: 1, cylinders: 4 },
        "0:0",
        "engine"
      ),
    ];

    // Generate ops to update only displacement
    const ops = generateOpsFromJson(initialNodes, {
      engine: { displacement: 2 },
    });

    // Build fresh tree and apply ops
    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      engine: LiveObject<{ displacement: number; cylinders: number }>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    // Verify engine is still a LiveObject and displacement was updated
    const engine = root.get("engine");
    expect(engine).toBeInstanceOf(LiveObject);
    expect(
      (engine as LiveObject<{ displacement: number; cylinders: number }>).get(
        "displacement"
      )
    ).toBe(2);
    expect(
      (engine as LiveObject<{ displacement: number; cylinders: number }>).get(
        "cylinders"
      )
    ).toBe(4); // Preserved!
  });

  test("full replacement of nested LiveObject", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedObject("0:1", { displacement: 1 }, "0:0", "engine"),
    ];

    // Replace entire engine with new LiveObject
    const newEngine = new LiveObject({ displacement: 3, turbo: true });
    const ops = generateOpsFromJson(initialNodes, {
      engine: newEngine,
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      engine: LiveObject<{ displacement: number; turbo?: boolean }>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const engine = root.get("engine");
    expect(engine).toBeInstanceOf(LiveObject);
    expect(
      (engine as LiveObject<{ displacement: number; turbo?: boolean }>).get(
        "displacement"
      )
    ).toBe(3);
    expect(
      (engine as LiveObject<{ displacement: number; turbo?: boolean }>).get(
        "turbo"
      )
    ).toBe(true);
  });

  test("add new nested structure", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
    ];

    // Add new nested LiveObject
    const ops = generateOpsFromJson(initialNodes, {
      car: {
        engine: { displacement: 2 },
      },
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      car?: LiveObject<{ engine: LiveObject<{ displacement: number }> }>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const car = root.get("car");
    expect(car).toBeInstanceOf(LiveObject);
    const engine = (
      car as LiveObject<{ engine: LiveObject<{ displacement: number }> }>
    ).get("engine");
    expect(engine).toBeInstanceOf(LiveObject);
    expect(
      (engine as LiveObject<{ displacement: number }>).get("displacement")
    ).toBe(2);
  });

  test("LiveMap mutations", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedMap("0:1", "0:0", "settings"),
      createSerializedRegister("0:2", "0:1", "theme", "dark"),
    ];

    // Merge new keys into existing LiveMap
    const ops = generateOpsFromJson(initialNodes, {
      settings: {
        theme: "light", // Update existing
        fontSize: 16, // Add new
      },
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      settings: LiveMap<string, Lson>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const settings = root.get("settings");
    expect(settings).toBeInstanceOf(LiveMap);
    expect(settings.get("theme")).toBe("light");
    expect(settings.get("fontSize")).toBe(16);
  });

  test("LiveList mutations - replace items", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedRegister("0:2", "0:1", FIRST_POSITION, "a"),
      createSerializedRegister("0:3", "0:1", SECOND_POSITION, "b"),
    ];

    // Replace all items in list
    const ops = generateOpsFromJson(initialNodes, {
      items: ["x", "y", "z"],
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      items: LiveList<string>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const items = root.get("items");
    expect(items).toBeInstanceOf(LiveList);
    // toImmutable() should extract data from LiveRegisters
    const immutable = items.toImmutable();
    expect(immutable).toEqual(["x", "y", "z"]);
  });

  test("Confirm that undefined values are ignored when existing keys are on a LiveObject", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", { a: 1, b: 2, c: 3 }),
    ];
    // Note: Our current implementation doesn't handle deletion via undefined
    // This test verifies that setting a new value works
    const ops = generateOpsFromJson(initialNodes, {
      a: 10, // Update
      b: undefined as any, // This should be ignored per our implementation
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      a: number;
      b: number;
      c: number;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    expect(root.get("a")).toBe(10);
    expect(root.get("b")).toBe(2); // Still exists since undefined is skipped
    expect(root.get("c")).toBe(3);
  });

  test("mixed nested structures", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedObject("0:1", {}, "0:0", "obj"),
      createSerializedMap("0:2", "0:0", "map"),
      createSerializedList("0:3", "0:0", "list"),
    ];

    // Update all three types
    const ops = generateOpsFromJson(initialNodes, {
      obj: { nested: "value" },
      map: { key: "value" },
      list: [1, 2, 3],
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      obj: LiveObject<{ nested?: string }>;
      map: LiveMap<string, Lson>;
      list: LiveList<number>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const obj = root.get("obj");
    expect(obj).toBeInstanceOf(LiveObject);
    expect((obj as LiveObject<{ nested?: string }>).get("nested")).toBe(
      "value"
    );

    const map = root.get("map");
    expect(map).toBeInstanceOf(LiveMap);
    expect(map.get("key")).toBe("value");

    const list = root.get("list");
    expect(list).toBeInstanceOf(LiveList);
    const listImmutable = list.toImmutable();
    expect(listImmutable).toEqual([1, 2, 3]);
  });

  test("plain object mutation (no Live structures)", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", { count: 0, name: "test" }),
    ];

    // Pure JSON mutation
    const ops = generateOpsFromJson(initialNodes, {
      count: 42,
      name: "updated",
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      count: number;
      name: string;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    expect(root.get("count")).toBe(42);
    expect(root.get("name")).toBe("updated");
  });

  test("deeply nested partial update", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedObject("0:1", {}, "0:0", "level1"),
      createSerializedObject(
        "0:2",
        { value: 1, other: "preserved" },
        "0:1",
        "level2"
      ),
    ];

    // Update deeply nested value while preserving structure
    const ops = generateOpsFromJson(initialNodes, {
      level1: {
        level2: {
          value: 2,
        },
      },
    });

    const pool = createManagedPool("test-room", {
      getCurrentConnectionId: () => 1,
    });
    const root = LiveObject._fromItems<{
      level1: LiveObject<{
        level2: LiveObject<{ value: number; other: string }>;
      }>;
    }>(initialNodes, pool);

    applyOpsToTree(root, ops);

    const level1 = root.get("level1");
    expect(level1).toBeInstanceOf(LiveObject);
    const level2 = (
      level1 as LiveObject<{
        level2: LiveObject<{ value: number; other: string }>;
      }>
    ).get("level2");
    expect(level2).toBeInstanceOf(LiveObject);
    expect(
      (level2 as LiveObject<{ value: number; other: string }>).get("value")
    ).toBe(2);
    expect(
      (level2 as LiveObject<{ value: number; other: string }>).get("other")
    ).toBe("preserved");
  });

  test("generates correct ops for nested LiveObject update", () => {
    const initialNodes: IdTuple<SerializedCrdt>[] = [
      createSerializedObject("0:0", {}),
      createSerializedObject("0:1", { a: 1, b: 2 }, "0:0", "nested"),
    ];

    const ops = generateOpsFromJson(initialNodes, {
      nested: { a: 10 },
    });

    // Should generate UPDATE_OBJECT op for the nested object
    const updateOps = ops.filter((op) => op.type === OpCode.UPDATE_OBJECT);
    expect(updateOps.length).toBeGreaterThan(0);

    const nestedUpdate = updateOps.find((op) => op.id === "0:1");
    expect(nestedUpdate).toBeDefined();
    expect((nestedUpdate as any).data.a).toBe(10);
  });
});
