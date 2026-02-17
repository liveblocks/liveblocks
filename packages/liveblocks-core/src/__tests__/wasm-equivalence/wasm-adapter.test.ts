import { afterEach, describe, expect, test, vi } from "vitest";

const WASM_LOCKED = process.env.LIVEBLOCKS_ENGINE === "wasm";

import type { CrdtEngine } from "../../crdts/impl-selector";
import { _setEngine } from "../../crdts/impl-selector";
import {
  deserializeItems,
  getBackend,
  getTreesDiffOperations,
  isWasmAvailable,
  isWasmReady,
  makePosition,
} from "../../crdts/wasm-adapter";
import { OpCode } from "../../protocol/Op";
import { CrdtType } from "../../protocol/SerializedCrdt";
import type { NodeMap } from "../../types/NodeMap";
import { FIRST_POSITION, SECOND_POSITION } from "../_utils";

afterEach(() => {
  // Reset to default (JS) engine
  _setEngine(null);
});

describe("wasm-adapter (JS fallback)", () => {
  test.skipIf(WASM_LOCKED)("getBackend returns 'js' when WASM not loaded", () => {
    expect(getBackend()).toBe("js");
  });

  test("isWasmAvailable detects WebAssembly support", () => {
    // jsdom includes WebAssembly
    expect(typeof isWasmAvailable()).toBe("boolean");
  });

  test("isWasmReady returns false initially", () => {
    expect(isWasmReady()).toBe(false);
  });
});

describe("makePosition (JS fallback)", () => {
  test("returns canonical first position with no arguments", () => {
    const pos = makePosition();
    expect(typeof pos).toBe("string");
    expect(pos.length).toBeGreaterThan(0);
  });

  test("returns position between two bounds", () => {
    const pos = makePosition(FIRST_POSITION, SECOND_POSITION);
    expect(typeof pos).toBe("string");
    // Result should be between the two bounds
    expect(pos > FIRST_POSITION).toBe(true);
    expect(pos < SECOND_POSITION).toBe(true);
  });

  test("returns position after a given bound", () => {
    const pos = makePosition(FIRST_POSITION);
    expect(typeof pos).toBe("string");
    expect(pos > FIRST_POSITION).toBe(true);
  });

  test("produces same result as direct JS import", async () => {
    // These use the same underlying JS implementation
    const { makePosition: jsPosition } = await import("../../lib/position");

    // No args
    expect(makePosition()).toBe(jsPosition());

    // After
    expect(makePosition(FIRST_POSITION)).toBe(jsPosition(FIRST_POSITION));

    // Between
    expect(makePosition(FIRST_POSITION, SECOND_POSITION)).toBe(
      jsPosition(FIRST_POSITION, SECOND_POSITION)
    );
  });
});

describe("getTreesDiffOperations (JS fallback)", () => {
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
  test.skipIf(WASM_LOCKED)("detects deleted node as DELETE_CRDT", () => {
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

  test("produces same results as direct JS import", async () => {
    const { getTreesDiffOperations: jsTreeDiff } = await import(
      "../../crdts/liveblocks-helpers"
    );

    const current: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { x: 1 } }],
      [
        "0:1",
        {
          type: CrdtType.OBJECT,
          parentId: "root",
          parentKey: "child",
          data: { y: 2 },
        },
      ],
    ]);

    const newItems: NodeMap = new Map([
      ["root", { type: CrdtType.OBJECT, data: { x: 99 } }],
      [
        "0:2",
        {
          type: CrdtType.LIST,
          parentId: "root",
          parentKey: "list",
        },
      ],
    ]);

    const adapterOps = getTreesDiffOperations(current, newItems);
    const directOps = jsTreeDiff(current, newItems);

    expect(adapterOps).toEqual(directOps);
  });
});

describe("deserializeItems (JS fallback)", () => {
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

describe("wasm-adapter with mock WASM engine", () => {
  test("delegates to WASM engine when set", () => {
    const mockWasmEngine: CrdtEngine = {
      backend: "wasm",
      makePosition: vi.fn(() => "wasm-position"),
      getTreesDiffOperations: vi.fn(() => []),
      deserializeItems: vi.fn(
        (items: Parameters<CrdtEngine["deserializeItems"]>[0]) =>
          new Map(items)
      ),
    };

    _setEngine(mockWasmEngine);

    expect(getBackend()).toBe("wasm");
    expect(makePosition()).toBe("wasm-position");
    expect(mockWasmEngine.makePosition).toHaveBeenCalled();
  });

  test("getTreesDiffOperations delegates to WASM", () => {
    const expectedOps = [{ type: OpCode.DELETE_CRDT, id: "0:1" }];
    const mockWasmEngine: CrdtEngine = {
      backend: "wasm",
      makePosition: vi.fn(() => "!"),
      getTreesDiffOperations: vi.fn(() => expectedOps),
      deserializeItems: vi.fn(
        (items: Parameters<CrdtEngine["deserializeItems"]>[0]) =>
          new Map(items)
      ),
    };

    _setEngine(mockWasmEngine);

    const current: NodeMap = new Map();
    const newItems: NodeMap = new Map();
    const ops = getTreesDiffOperations(current, newItems);

    expect(ops).toBe(expectedOps);
    expect(mockWasmEngine.getTreesDiffOperations).toHaveBeenCalledWith(
      current,
      newItems
    );
  });

  test("switching back to JS engine works", () => {
    const mockWasmEngine: CrdtEngine = {
      backend: "wasm",
      makePosition: vi.fn(() => "wasm-pos"),
      getTreesDiffOperations: vi.fn(() => []),
      deserializeItems: vi.fn(
        (items: Parameters<CrdtEngine["deserializeItems"]>[0]) =>
          new Map(items)
      ),
    };

    _setEngine(mockWasmEngine);
    expect(getBackend()).toBe("wasm");

    // Call makePosition while WASM is active
    const wasmPos = makePosition();
    expect(wasmPos).toBe("wasm-pos");
    expect(mockWasmEngine.makePosition).toHaveBeenCalledTimes(1);

    // Reset to JS
    _setEngine(null);
    expect(getBackend()).toBe("js");

    // makePosition should use JS now
    const jsPos = makePosition();
    expect(jsPos).not.toBe("wasm-pos");
    // Mock should not have been called again after reset
    expect(mockWasmEngine.makePosition).toHaveBeenCalledTimes(1);
  });
});
