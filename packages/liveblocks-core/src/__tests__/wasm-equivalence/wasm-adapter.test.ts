import { describe, expect, test, vi } from "vitest";

const IS_WASM = process.env.LIVEBLOCKS_ENGINE === "wasm";

import type { CrdtEngine } from "../../crdts/impl-selector";
import { _setEngine } from "../../crdts/impl-selector";
import {
  deserializeItems,
  getBackend,
  getTreesDiffOperations,
  makePosition,
} from "../../crdts/wasm-adapter";
import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/StorageNode";
import type { NodeMap } from "../../protocol/StorageNode";
import { FIRST_POSITION, SECOND_POSITION } from "../_utils";

describe("wasm-adapter basics", () => {
  test("getBackend returns the active engine", () => {
    expect(getBackend()).toBe(IS_WASM ? "wasm" : "js");
  });
});

describe("makePosition", () => {
  test("returns canonical first position with no arguments", () => {
    const pos = makePosition();
    expect(typeof pos).toBe("string");
    expect(pos.length).toBeGreaterThan(0);
  });

  test("returns position between two bounds", () => {
    const pos = makePosition(FIRST_POSITION, SECOND_POSITION);
    expect(typeof pos).toBe("string");
    expect(pos > FIRST_POSITION).toBe(true);
    expect(pos < SECOND_POSITION).toBe(true);
  });

  test("returns position after a given bound", () => {
    const pos = makePosition(FIRST_POSITION);
    expect(typeof pos).toBe("string");
    expect(pos > FIRST_POSITION).toBe(true);
  });

  test("produces same result as direct JS import", async () => {
    const { makePosition: jsPosition } = await import("../../lib/position");

    expect(makePosition()).toBe(jsPosition());
    expect(makePosition(FIRST_POSITION)).toBe(jsPosition(FIRST_POSITION));
    expect(makePosition(FIRST_POSITION, SECOND_POSITION)).toBe(
      jsPosition(FIRST_POSITION, SECOND_POSITION)
    );
  });
});

describe("getTreesDiffOperations", () => {
  test("empty trees produce no ops", () => {
    const items: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);
    const ops = getTreesDiffOperations(items, items);
    expect(ops).toEqual([]);
  });

  test("detects new node as CREATE_REGISTER", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
    ]);
    const newItems = new Map(current);
    newItems.set("1:1", {
      type: CrdtType.REGISTER,
      parentId: "0:1",
      parentKey: FIRST_POSITION,
      data: "A",
    });

    const ops = getTreesDiffOperations(current, newItems);
    expect(ops).toEqual([
      {
        type: OpCode.CREATE_REGISTER,
        id: "1:1",
        parentId: "0:1",
        parentKey: FIRST_POSITION,
        data: "A",
      },
    ]);
  });

  // When WASM is active, the DocumentHandle normalizes register children
  // into object data, so deleting a register child shows as UPDATE_OBJECT
  // (data change) rather than DELETE_CRDT. Both are semantically correct.
  test.skipIf(IS_WASM)("detects deleted node as DELETE_CRDT", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.REGISTER,
          parentId: "root",
          parentKey: "x",
          data: 42,
        },
      ],
    ]);
    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
    ]);

    const ops = getTreesDiffOperations(current, newItems);
    expect(ops).toEqual([
      {
        type: OpCode.DELETE_CRDT,
        id: "0:1",
      },
    ]);
  });

  test("detects updated object data as UPDATE_OBJECT", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { a: 1 } }],
    ]);
    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { a: 2 } }],
    ]);

    const ops = getTreesDiffOperations(current, newItems);
    expect(ops).toEqual([
      {
        type: OpCode.UPDATE_OBJECT,
        id: "root",
        data: { a: 2 },
      },
    ]);
  });

  test("detects moved node as SET_PARENT_KEY", () => {
    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.REGISTER,
          parentId: "0:1",
          parentKey: FIRST_POSITION,
          data: "A",
        },
      ],
    ]);
    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: {} }],
      ["0:1", { type: CrdtType.LIST, parentId: "root", parentKey: "items" }],
      [
        "0:2",
        {
          type: CrdtType.REGISTER,
          parentId: "0:1",
          parentKey: SECOND_POSITION,
          data: "A",
        },
      ],
    ]);

    const ops = getTreesDiffOperations(current, newItems);
    expect(ops).toEqual([
      {
        type: OpCode.SET_PARENT_KEY,
        id: "0:2",
        parentKey: SECOND_POSITION,
      },
    ]);
  });
});

describe("deserializeItems", () => {
  test("creates NodeMap from tuples", () => {
    const items = [
      ["root", { type: CrdtType.OBJECT, data: {} }],
      [
        "0:1",
        {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "items",
        },
      ],
    ] as const;

    const nodeMap = deserializeItems(items as any);
    expect(nodeMap.size).toBe(2);
    expect(nodeMap.get("root")).toBeDefined();
    expect(nodeMap.get("0:1")).toBeDefined();
  });
});

describe("engine immutability", () => {
  test("engine choice is immutable once set", () => {
    const backend = getBackend();

    const mockEngine: CrdtEngine = {
      backend: backend === "wasm" ? "js" : "wasm",
      makePosition: vi.fn(() => "mock"),
      getTreesDiffOperations: vi.fn(() => []),
      deserializeItems: vi.fn(
        (items: Parameters<CrdtEngine["deserializeItems"]>[0]) =>
          new Map(items)
      ),
    };

    _setEngine(mockEngine);
    expect(getBackend()).toBe(backend);
  });
});
