/**
 * JS↔WASM Mutation Equivalence Tests
 *
 * For each mutation type, perform the same mutation through both:
 * 1. JS path: LiveObject/LiveList/LiveMap in a test room, capturing dispatched ops
 * 2. WASM path: DocumentHandle + handle mutations, parsing MutationResult
 * 3. Compare: forward ops, reverse ops, and storage update structure match
 *
 * These tests only run when LIVEBLOCKS_ENGINE=wasm.
 */
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";

import type { LiveList } from "../../crdts/LiveList";
import type { LiveMap } from "../../crdts/LiveMap";
import type { WasmMutationResult } from "../../crdts/wasm-mutation-adapter";
import { OpCode } from "../../protocol/Op";
import type { StorageNode } from "../../protocol/StorageNode";
import {
  createSerializedList,
  createSerializedMap,
  createSerializedRegister,
  createSerializedRoot,
  FIRST_POSITION,
  prepareIsolatedStorageTest,
  SECOND_POSITION,
} from "../_utils";

const IS_WASM = process.env.LIVEBLOCKS_ENGINE === "wasm";

// Skip the entire suite if not running under WASM engine
const describeMaybe = IS_WASM ? describe : describe.skip;

interface WasmDocumentHandle {
  root: WasmLiveObjectHandle | undefined;
  setConnectionId(id: number): void;
  initFromItems(items: unknown): void;
  fromItems(items: unknown): WasmDocumentHandle;
  getListById(id: string): WasmLiveListHandle | undefined;
  getMapById(id: string): WasmLiveMapHandle | undefined;
  getObjectById(id: string): WasmLiveObjectHandle | undefined;
  free(): void;
}

interface WasmLiveObjectHandle {
  id: string;
  get(key: string): unknown;
  set(key: string, value: unknown): WasmMutationResult;
  update(updates: unknown): WasmMutationResult;
  delete(key: string): WasmMutationResult;
  toObject(): Record<string, unknown>;
  free(): void;
}

interface WasmLiveListHandle {
  id: string;
  length: number;
  get(index: number): unknown;
  push(value: unknown): WasmMutationResult;
  insert(value: unknown, index: number): WasmMutationResult;
  move(fromIndex: number, toIndex: number): WasmMutationResult;
  delete(index: number): WasmMutationResult;
  set(index: number, value: unknown): WasmMutationResult;
  clear(): WasmMutationResult;
  toArray(): unknown[];
  free(): void;
}

interface WasmLiveMapHandle {
  id: string;
  size: number;
  get(key: string): unknown;
  set(key: string, value: unknown): WasmMutationResult;
  delete(key: string): unknown;
  has(key: string): boolean;
  free(): void;
}

interface WasmPkg {
  DocumentHandle: {
    new (): WasmDocumentHandle;
    fromItems(items: unknown): WasmDocumentHandle;
  };
}

let wasmPkg: WasmPkg;

beforeAll(() => {
  if (!IS_WASM) return;
  const pkgPath = path.resolve(
    __dirname,
    "../../../../liveblocks-wasm/pkg/liveblocks_wasm.js"
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  wasmPkg = require(pkgPath) as WasmPkg;
});

/**
 * Create a WASM DocumentHandle from serialized items with a given connection ID.
 */
function createWasmDoc(
  items: StorageNode[],
  connectionId: number
): WasmDocumentHandle {
  const doc = wasmPkg.DocumentHandle.fromItems(items);
  doc.setConnectionId(connectionId);
  return doc;
}

/**
 * Access a field on an op by treating it as a record.
 * Ops are a discriminated union, so we need to cast when accessing
 * fields that only exist on specific variants.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function opField(op: unknown, field: string): any {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
  return (op as any)[field];
}

describeMaybe("JS↔WASM Mutation Equivalence", () => {
  // ============================================================
  // LiveObject mutations
  // ============================================================
  describe("LiveObject", () => {
    const ACTOR = 1;

    it("set(key, value) — new key", async () => {
      const items: StorageNode[] = [createSerializedRoot({})];

      // --- JS path ---
      const { root } = await prepareIsolatedStorageTest<{
        name?: string;
      }>(items, ACTOR);
      root.set("name", "Alice");

      // --- WASM path ---
      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("name", "Alice");

      // Verify WASM result has correct structure
      expect(result).toBeDefined();
      expect(result.ops).toBeDefined();
      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.UPDATE_OBJECT);
      expect(result.reverseOps).toBeDefined();
      expect(result.reverseOps.length).toBe(1);
      // New key → reverse is DELETE_OBJECT_KEY
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_OBJECT_KEY);
      expect(result.update).toBeDefined();
      expect(result.update.type).toBe("liveObjectUpdate");
      expect(result.update.nodeId).toBe("root");

      // Verify opId format
      expect(result.ops[0].opId).toMatch(/^\d+:\d+$/);

      // Verify forward op data
      expect(opField(result.ops[0], "data")).toEqual({
        name: "Alice",
      });

      doc.free();
    });

    it("set(key, value) — existing key", () => {
      const items: StorageNode[] = [
        createSerializedRoot({ name: "Alice" }),
      ];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("name", "Bob");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.UPDATE_OBJECT);
      expect(opField(result.ops[0], "data")).toEqual({
        name: "Bob",
      });

      // Existing key → reverse is UPDATE_OBJECT with old value
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.UPDATE_OBJECT);
      expect(opField(result.reverseOps[0], "data")).toEqual({
        name: "Alice",
      });

      expect(result.update.type).toBe("liveObjectUpdate");

      doc.free();
    });

    it("update({a, b}) — multiple keys", () => {
      const items: StorageNode[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.update({ a: 1, b: 2 });

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.UPDATE_OBJECT);
      expect(opField(result.ops[0], "data")).toEqual({
        a: 1,
        b: 2,
      });

      // Both keys are new → reverse has DELETE_OBJECT_KEY ops
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      for (const rev of result.reverseOps) {
        expect(
          rev.type === OpCode.DELETE_OBJECT_KEY ||
            rev.type === OpCode.UPDATE_OBJECT
        ).toBe(true);
      }

      doc.free();
    });

    it("delete(key) — existing key", () => {
      const items: StorageNode[] = [
        createSerializedRoot({ name: "Alice" }),
      ];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.delete("name");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.DELETE_OBJECT_KEY);

      // Reverse is UPDATE_OBJECT with old value
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.UPDATE_OBJECT);
      expect(opField(result.reverseOps[0], "data")).toEqual({
        name: "Alice",
      });

      expect(result.update.type).toBe("liveObjectUpdate");
      expect(result.update.nodeId).toBe("root");

      doc.free();
    });
  });

  // ============================================================
  // LiveList mutations
  // ============================================================
  describe("LiveList", () => {
    const ACTOR = 1;

    function makeListItems(): StorageNode[] {
      return [
        createSerializedRoot({}),
        createSerializedList("0:0", "root", "items"),
        createSerializedRegister("0:1", "0:0", FIRST_POSITION, "A"),
        createSerializedRegister("0:2", "0:0", SECOND_POSITION, "B"),
      ];
    }

    it("push(value)", async () => {
      const items = makeListItems();

      // --- JS path ---
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(items, ACTOR);
      const jsList = root.get("items");
      const jsBefore = jsList.length;
      jsList.push("C");
      expect(jsList.length).toBe(jsBefore + 1);

      // --- WASM path ---
      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      expect(wasmList).toBeDefined();
      const result = wasmList.push("C");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.ops[0], "parentId")).toBe("0:0");
      expect(opField(result.ops[0], "data")).toBe("C");

      // Reverse: DELETE_CRDT to undo the push
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_CRDT);

      expect(result.update.type).toBe("liveListUpdate");
      expect(result.update.nodeId).toBe("0:0");

      // Verify opId format
      expect(result.ops[0].opId).toMatch(/^\d+:\d+$/);

      doc.free();
    });

    it("insert(value, index)", () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.insert("X", 1); // insert at index 1

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.ops[0], "data")).toBe("X");

      // Position should be between FIRST_POSITION and SECOND_POSITION
      const parentKey = opField(result.ops[0], "parentKey") as string;
      expect(parentKey > FIRST_POSITION).toBe(true);
      expect(parentKey < SECOND_POSITION).toBe(true);

      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });

    it("move(from, to)", () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.move(0, 1); // move "A" after "B"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.SET_PARENT_KEY);

      // Reverse: SET_PARENT_KEY back to old position
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.SET_PARENT_KEY);

      expect(result.update.type).toBe("liveListUpdate");

      doc.free();
    });

    it("delete(index)", () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.delete(0); // delete "A"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.DELETE_CRDT);
      expect(opField(result.ops[0], "id")).toBe("0:1");

      // Reverse: CREATE_REGISTER chain to recreate "A"
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0].type).toBe(OpCode.CREATE_REGISTER);

      expect(result.update.type).toBe("liveListUpdate");

      doc.free();
    });

    it("set(index, value)", () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.set(0, "Z"); // replace "A" with "Z"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.ops[0], "data")).toBe("Z");

      // Intent hack: forward op has intent="set" and deletedId
      expect(opField(result.ops[0], "intent")).toBe("set");
      expect(opField(result.ops[0], "deletedId")).toBe("0:1");

      // Reverse: CREATE_REGISTER with intent="set"
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(opField(result.reverseOps[0], "intent")).toBe("set");

      doc.free();
    });

    it("clear()", () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.clear();

      // Should produce DELETE_CRDT for each child
      expect(result.ops.length).toBe(2);
      for (const op of result.ops) {
        expect(op.type).toBe(OpCode.DELETE_CRDT);
      }

      // Reverse: CREATE_REGISTER chains for all children
      expect(result.reverseOps.length).toBe(2);
      for (const rev of result.reverseOps) {
        expect(rev.type).toBe(OpCode.CREATE_REGISTER);
      }

      expect(result.update.type).toBe("liveListUpdate");

      doc.free();
    });
  });

  // ============================================================
  // LiveMap mutations
  // ============================================================
  describe("LiveMap", () => {
    const ACTOR = 1;

    function makeMapItems(): StorageNode[] {
      return [
        createSerializedRoot({}),
        createSerializedMap("0:0", "root", "myMap"),
        createSerializedRegister("0:1", "0:0", "key1", "value1"),
      ];
    }

    it("set(key, value) — new key", async () => {
      const items = makeMapItems();

      // --- JS path ---
      const { root } = await prepareIsolatedStorageTest<{
        myMap: LiveMap<string, string>;
      }>(items, ACTOR);
      const jsMap = root.get("myMap");
      jsMap.set("key2", "value2");
      expect(jsMap.get("key2")).toBe("value2");

      // --- WASM path ---
      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      expect(wasmMap).toBeDefined();
      const result = wasmMap.set("key2", "value2");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.ops[0], "parentId")).toBe("0:0");
      expect(opField(result.ops[0], "parentKey")).toBe("key2");
      expect(opField(result.ops[0], "data")).toBe("value2");

      // No old value → reverse is DELETE_CRDT
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_CRDT);

      expect(result.update.type).toBe("liveMapUpdate");
      expect(result.update.nodeId).toBe("0:0");

      doc.free();
    });

    it("set(key, value) — replacing existing", () => {
      const items = makeMapItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      const result = wasmMap.set("key1", "newValue");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.ops[0], "data")).toBe("newValue");

      // Old value existed → reverse is CREATE_REGISTER chain (recreate old register)
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(opField(result.reverseOps[0], "data")).toBe("value1");

      doc.free();
    });

    it("delete(key)", () => {
      const items = makeMapItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      const result = wasmMap.delete("key1") as WasmMutationResult;

      expect(result.ops.length).toBe(1);
      expect(result.ops[0].type).toBe(OpCode.DELETE_CRDT);
      expect(opField(result.ops[0], "id")).toBe("0:1");

      // Reverse: CREATE_REGISTER chain to recreate deleted entry
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0].type).toBe(OpCode.CREATE_REGISTER);

      expect(result.update.type).toBe("liveMapUpdate");
      expect(result.update.nodeId).toBe("0:0");

      doc.free();
    });
  });

  // ============================================================
  // Cross-check: JS and WASM produce same op types for same mutations
  // ============================================================
  describe("JS↔WASM op type parity", () => {
    const ACTOR = 1;

    it("LiveObject.set produces same op types", async () => {
      const items: StorageNode[] = [
        createSerializedRoot({ x: 1 }),
      ];

      // JS path
      const { root } = await prepareIsolatedStorageTest<{
        x: number;
      }>(items, ACTOR);
      root.set("x", 42);

      // WASM path
      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("x", 42);

      // Both should produce UPDATE_OBJECT forward op
      expect(result.ops[0].type).toBe(OpCode.UPDATE_OBJECT);
      // Both should produce UPDATE_OBJECT reverse op (existing key)
      expect(result.reverseOps[0].type).toBe(OpCode.UPDATE_OBJECT);

      // Verify data payloads match
      expect(opField(result.ops[0], "data")).toEqual({ x: 42 });
      expect(opField(result.reverseOps[0], "data")).toEqual({ x: 1 });

      doc.free();
    });

    it("LiveList.push produces same op types", async () => {
      const items: StorageNode[] = [
        createSerializedRoot({}),
        createSerializedList("0:0", "root", "items"),
      ];

      // JS path
      const { root } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>(items, ACTOR);
      root.get("items").push("hello");

      // WASM path
      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.push("hello");

      // Both should produce CREATE_REGISTER forward, DELETE_CRDT reverse
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });

    it("LiveMap.set (new key) produces same op types", async () => {
      const items: StorageNode[] = [
        createSerializedRoot({}),
        createSerializedMap("0:0", "root", "myMap"),
      ];

      // JS path
      const { root } = await prepareIsolatedStorageTest<{
        myMap: LiveMap<string, string>;
      }>(items, ACTOR);
      root.get("myMap").set("k", "v");

      // WASM path
      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      const result = wasmMap.set("k", "v");

      // Both should produce CREATE_REGISTER forward, DELETE_CRDT reverse
      expect(result.ops[0].type).toBe(OpCode.CREATE_REGISTER);
      expect(result.reverseOps[0].type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });
  });

  // ============================================================
  // setConnectionId verification
  // ============================================================
  describe("setConnectionId", () => {
    it("opIds use the correct connection ID prefix", () => {
      const items: StorageNode[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, 42);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("x", 1);

      // opId should start with "42:"
      expect(result.ops[0].opId).toMatch(/^42:\d+$/);

      doc.free();
    });

    it("changing connectionId updates opId prefix", () => {
      const items: StorageNode[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, 1);
      const root1 = doc.root!;
      const r1 = root1.set("x", 1);
      expect(r1.ops[0].opId).toMatch(/^1:\d+$/);

      // Change connection ID
      doc.setConnectionId(99);
      const root2 = doc.root!;
      const r2 = root2.set("y", 2);
      expect(r2.ops[0].opId).toMatch(/^99:\d+$/);

      doc.free();
    });
  });
});
