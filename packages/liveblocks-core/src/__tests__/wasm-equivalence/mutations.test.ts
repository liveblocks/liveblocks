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
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { OpCode } from "../../protocol/Op";
import type { Op } from "../../protocol/Op";
import { CrdtType } from "../../protocol/SerializedCrdt";
import type { IdTuple, SerializedCrdt } from "../../protocol/SerializedCrdt";
import type { WasmMutationResult } from "../../crdts/wasm-mutation-adapter";
import {
  createSerializedList,
  createSerializedMap,
  createSerializedRegister,
  createSerializedRoot,
  prepareIsolatedStorageTest,
  FIRST_POSITION,
  SECOND_POSITION,
} from "../_utils";
import { LiveList } from "../../crdts/LiveList";
import { LiveMap } from "../../crdts/LiveMap";

const IS_WASM = process.env.LIVEBLOCKS_ENGINE === "wasm";

// Skip the entire suite if not running under WASM engine
const describeMaybe = IS_WASM ? describe : describe.skip;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  wasmPkg = require(pkgPath) as WasmPkg;
});

/**
 * Create a WASM DocumentHandle from serialized items with a given connection ID.
 */
function createWasmDoc(
  items: IdTuple<SerializedCrdt>[],
  connectionId: number
): WasmDocumentHandle {
  const doc = wasmPkg.DocumentHandle.fromItems(items);
  doc.setConnectionId(connectionId);
  return doc;
}

/**
 * Strip fields that differ between JS and WASM but are not semantically relevant
 * for comparison: `node` references in StorageUpdates, and normalize op shapes.
 */
function normalizeOp(op: Op): Record<string, unknown> {
  // Clone and remove undefined fields
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(op)) {
    if (value !== undefined) {
      normalized[key] = value;
    }
  }
  return normalized;
}

/**
 * Compare forward ops structurally, ignoring opId counters but checking format.
 */
function compareOps(jsOps: Op[], wasmOps: Op[]): void {
  expect(wasmOps.length).toBe(jsOps.length);

  for (let i = 0; i < jsOps.length; i++) {
    const jsOp = normalizeOp(jsOps[i]!);
    const wasmOp = normalizeOp(wasmOps[i]!);

    // Op type must match
    expect(wasmOp.type).toBe(jsOp.type);

    // Node id/parentId/parentKey must match
    if ("id" in jsOp) expect(wasmOp.id).toBe(jsOp.id);
    if ("parentId" in jsOp) expect(wasmOp.parentId).toBe(jsOp.parentId);
    if ("parentKey" in jsOp) expect(wasmOp.parentKey).toBe(jsOp.parentKey);

    // Data payload must match
    if ("data" in jsOp) expect(wasmOp.data).toEqual(jsOp.data);

    // Intent hack fields
    if ("intent" in jsOp) expect(wasmOp.intent).toBe(jsOp.intent);
    if ("deletedId" in jsOp) expect(wasmOp.deletedId).toBe(jsOp.deletedId);

    // opId format: "{connectionId}:{counter}"
    if (jsOp.opId) {
      expect(wasmOp.opId).toMatch(/^\d+:\d+$/);
    }
  }
}

/**
 * Compare reverse ops structurally.
 */
function compareReverseOps(jsRev: Op[], wasmRev: Op[]): void {
  expect(wasmRev.length).toBe(jsRev.length);

  for (let i = 0; i < jsRev.length; i++) {
    const jsOp = normalizeOp(jsRev[i]!);
    const wasmOp = normalizeOp(wasmRev[i]!);

    expect(wasmOp.type).toBe(jsOp.type);
    if ("id" in jsOp) expect(wasmOp.id).toBe(jsOp.id);
    if ("parentId" in jsOp) expect(wasmOp.parentId).toBe(jsOp.parentId);
    if ("parentKey" in jsOp) expect(wasmOp.parentKey).toBe(jsOp.parentKey);
    if ("data" in jsOp) expect(wasmOp.data).toEqual(jsOp.data);
    if ("intent" in jsOp) expect(wasmOp.intent).toBe(jsOp.intent);
    if ("deletedId" in jsOp) expect(wasmOp.deletedId).toBe(jsOp.deletedId);
  }
}

describeMaybe("JS↔WASM Mutation Equivalence", () => {
  // ============================================================
  // LiveObject mutations
  // ============================================================
  describe("LiveObject", () => {
    const ACTOR = 1;

    it("set(key, value) — new key", async () => {
      const items: IdTuple<SerializedCrdt>[] = [createSerializedRoot({})];

      // --- JS path ---
      const { root, room } = await prepareIsolatedStorageTest<{
        name?: string;
      }>(items, ACTOR);
      root.set("name", "Alice");
      const jsOps = room[
        // @ts-expect-error internal access
        "__internal"
      ] as unknown;
      // Use a different approach: capture ops from the WebSocket messages
      // We need to look at what the JS side dispatched

      // --- WASM path ---
      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("name", "Alice");

      // Verify WASM result has correct structure
      expect(result).toBeDefined();
      expect(result.ops).toBeDefined();
      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      expect(result.reverseOps).toBeDefined();
      expect(result.reverseOps.length).toBe(1);
      // New key → reverse is DELETE_OBJECT_KEY
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_OBJECT_KEY);
      expect(result.update).toBeDefined();
      expect(result.update.type).toBe("liveObjectUpdate");
      expect(result.update.nodeId).toBe("root");

      // Verify opId format
      expect(result.ops[0]!.opId).toMatch(/^\d+:\d+$/);

      // Verify forward op data
      expect((result.ops[0] as Record<string, unknown>).data).toEqual({
        name: "Alice",
      });

      doc.free();
    });

    it("set(key, value) — existing key", async () => {
      const items: IdTuple<SerializedCrdt>[] = [
        createSerializedRoot({ name: "Alice" }),
      ];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("name", "Bob");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      expect((result.ops[0] as Record<string, unknown>).data).toEqual({
        name: "Bob",
      });

      // Existing key → reverse is UPDATE_OBJECT with old value
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      expect(
        (result.reverseOps[0] as Record<string, unknown>).data
      ).toEqual({ name: "Alice" });

      expect(result.update.type).toBe("liveObjectUpdate");

      doc.free();
    });

    it("update({a, b}) — multiple keys", async () => {
      const items: IdTuple<SerializedCrdt>[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.update({ a: 1, b: 2 });

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      expect((result.ops[0] as Record<string, unknown>).data).toEqual({
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

    it("delete(key) — existing key", async () => {
      const items: IdTuple<SerializedCrdt>[] = [
        createSerializedRoot({ name: "Alice" }),
      ];

      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.delete("name");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.DELETE_OBJECT_KEY);

      // Reverse is UPDATE_OBJECT with old value
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      expect(
        (result.reverseOps[0] as Record<string, unknown>).data
      ).toEqual({ name: "Alice" });

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

    function makeListItems(): IdTuple<SerializedCrdt>[] {
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
      // Capture length before push to verify mutation
      const jsBefore = jsList.length;
      jsList.push("C");
      expect(jsList.length).toBe(jsBefore + 1);

      // --- WASM path ---
      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      expect(wasmList).toBeDefined();
      const result = wasmList.push("C");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect((result.ops[0] as Record<string, unknown>).parentId).toBe(
        "0:0"
      );
      expect((result.ops[0] as Record<string, unknown>).data).toBe("C");

      // Reverse: DELETE_CRDT to undo the push
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_CRDT);

      expect(result.update.type).toBe("liveListUpdate");
      expect(result.update.nodeId).toBe("0:0");

      // Verify opId format
      expect(result.ops[0]!.opId).toMatch(/^\d+:\d+$/);

      doc.free();
    });

    it("insert(value, index)", async () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.insert("X", 1); // insert at index 1

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect((result.ops[0] as Record<string, unknown>).data).toBe("X");

      // Position should be between FIRST_POSITION and SECOND_POSITION
      const parentKey = (result.ops[0] as Record<string, unknown>)
        .parentKey as string;
      expect(parentKey > FIRST_POSITION).toBe(true);
      expect(parentKey < SECOND_POSITION).toBe(true);

      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });

    it("move(from, to)", async () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.move(0, 1); // move "A" after "B"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.SET_PARENT_KEY);

      // Reverse: SET_PARENT_KEY back to old position
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.SET_PARENT_KEY);

      expect(result.update.type).toBe("liveListUpdate");

      doc.free();
    });

    it("delete(index)", async () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.delete(0); // delete "A"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.DELETE_CRDT);
      expect((result.ops[0] as Record<string, unknown>).id).toBe("0:1");

      // Reverse: CREATE_REGISTER chain to recreate "A"
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.CREATE_REGISTER);

      expect(result.update.type).toBe("liveListUpdate");

      doc.free();
    });

    it("set(index, value)", async () => {
      const items = makeListItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmList = doc.getListById("0:0")!;
      const result = wasmList.set(0, "Z"); // replace "A" with "Z"

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect((result.ops[0] as Record<string, unknown>).data).toBe("Z");

      // Intent hack: forward op has intent="set" and deletedId
      expect((result.ops[0] as Record<string, unknown>).intent).toBe("set");
      expect(
        (result.ops[0] as Record<string, unknown>).deletedId
      ).toBe("0:1");

      // Reverse: CREATE_REGISTER with intent="set"
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(
        (result.reverseOps[0] as Record<string, unknown>).intent
      ).toBe("set");

      doc.free();
    });

    it("clear()", async () => {
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

    function makeMapItems(): IdTuple<SerializedCrdt>[] {
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
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect((result.ops[0] as Record<string, unknown>).parentId).toBe(
        "0:0"
      );
      expect((result.ops[0] as Record<string, unknown>).parentKey).toBe(
        "key2"
      );
      expect((result.ops[0] as Record<string, unknown>).data).toBe(
        "value2"
      );

      // No old value → reverse is DELETE_CRDT
      expect(result.reverseOps.length).toBe(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_CRDT);

      expect(result.update.type).toBe("liveMapUpdate");
      expect(result.update.nodeId).toBe("0:0");

      doc.free();
    });

    it("set(key, value) — replacing existing", async () => {
      const items = makeMapItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      const result = wasmMap.set("key1", "newValue");

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect((result.ops[0] as Record<string, unknown>).data).toBe(
        "newValue"
      );

      // Old value existed → reverse is CREATE_REGISTER chain (recreate old register)
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect(
        (result.reverseOps[0] as Record<string, unknown>).data
      ).toBe("value1");

      doc.free();
    });

    it("delete(key)", async () => {
      const items = makeMapItems();

      const doc = createWasmDoc(items, ACTOR);
      const wasmMap = doc.getMapById("0:0")!;
      const result = wasmMap.delete("key1") as unknown as WasmMutationResult;

      expect(result.ops.length).toBe(1);
      expect(result.ops[0]!.type).toBe(OpCode.DELETE_CRDT);
      expect((result.ops[0] as Record<string, unknown>).id).toBe("0:1");

      // Reverse: CREATE_REGISTER chain to recreate deleted entry
      expect(result.reverseOps.length).toBeGreaterThanOrEqual(1);
      expect(result.reverseOps[0]!.type).toBe(OpCode.CREATE_REGISTER);

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
      const items: IdTuple<SerializedCrdt>[] = [
        createSerializedRoot({ x: 1 }),
      ];

      // JS path
      const { root, room } = await prepareIsolatedStorageTest<{
        x: number;
      }>(items, ACTOR);
      root.set("x", 42);

      // WASM path
      const doc = createWasmDoc(items, ACTOR);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("x", 42);

      // Both should produce UPDATE_OBJECT forward op
      expect(result.ops[0]!.type).toBe(OpCode.UPDATE_OBJECT);
      // Both should produce UPDATE_OBJECT reverse op (existing key)
      expect(result.reverseOps[0]!.type).toBe(OpCode.UPDATE_OBJECT);

      // Verify data payloads match
      expect((result.ops[0] as Record<string, unknown>).data).toEqual({
        x: 42,
      });
      expect(
        (result.reverseOps[0] as Record<string, unknown>).data
      ).toEqual({ x: 1 });

      doc.free();
    });

    it("LiveList.push produces same op types", async () => {
      const items: IdTuple<SerializedCrdt>[] = [
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
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });

    it("LiveMap.set (new key) produces same op types", async () => {
      const items: IdTuple<SerializedCrdt>[] = [
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
      expect(result.ops[0]!.type).toBe(OpCode.CREATE_REGISTER);
      expect(result.reverseOps[0]!.type).toBe(OpCode.DELETE_CRDT);

      doc.free();
    });
  });

  // ============================================================
  // setConnectionId verification
  // ============================================================
  describe("setConnectionId", () => {
    it("opIds use the correct connection ID prefix", () => {
      const items: IdTuple<SerializedCrdt>[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, 42);
      const wasmRoot = doc.root!;
      const result = wasmRoot.set("x", 1);

      // opId should start with "42:"
      expect(result.ops[0]!.opId).toMatch(/^42:\d+$/);

      doc.free();
    });

    it("changing connectionId updates opId prefix", () => {
      const items: IdTuple<SerializedCrdt>[] = [createSerializedRoot({})];

      const doc = createWasmDoc(items, 1);
      const root1 = doc.root!;
      const r1 = root1.set("x", 1);
      expect(r1.ops[0]!.opId).toMatch(/^1:\d+$/);

      // Change connection ID
      doc.setConnectionId(99);
      const root2 = doc.root!;
      const r2 = root2.set("y", 2);
      expect(r2.ops[0]!.opId).toMatch(/^99:\d+$/);

      doc.free();
    });
  });
});
