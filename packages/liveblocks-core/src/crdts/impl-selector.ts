/**
 * Implementation selector for CRDT operations.
 *
 * The engine choice is binary and explicit:
 * - Default: JS engine (no configuration needed)
 * - WASM: call `_setEngine(wasmEngine)` at startup — it works or it fails
 *
 * Once set, the engine is immutable for the lifetime of the process.
 * There is no fallback, no auto-detection, and no graceful degradation.
 */

import type { Op } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import type { NodeMap } from "../types/NodeMap";

/**
 * A persistent WASM document that mirrors the JS tree state.
 * Keeps a WASM DocumentHandle alive to avoid per-call serialization overhead.
 */
export interface CrdtDocumentShadow {
  /** Re-initialize from a full snapshot (first load or reconnect). */
  initFromItems(items: IdTuple<SerializedCrdt>[]): void;
  /** Forward a single op to keep shadow in sync. */
  applyOp(op: Op, source: "local" | "ours" | "theirs"): void;
  /** Forward a batch of ops. */
  applyOps(ops: readonly Op[], source: "local" | "ours" | "theirs"): void;
  /** Fast diff: compute ops to reconcile THIS shadow's state against a new snapshot. */
  diffAgainstSnapshot(newItems: IdTuple<SerializedCrdt>[]): Op[];
  /** Set the connection ID so WASM-generated ops use the correct actor prefix. */
  setConnectionId(id: number): void;

  // -- Mutation delegation --
  objectUpdate(nodeId: string, data: unknown): unknown;
  objectDelete(nodeId: string, key: string): unknown;
  listPush(nodeId: string, value: unknown): unknown;
  listInsert(nodeId: string, value: unknown, index: number): unknown;
  listMove(nodeId: string, from: number, to: number): unknown;
  listDelete(nodeId: string, index: number): unknown;
  listSet(nodeId: string, index: number, value: unknown): unknown;
  listClear(nodeId: string): unknown;
  mapSet(nodeId: string, key: string, value: unknown): unknown;
  mapDelete(nodeId: string, key: string): unknown;

  // -- ID generation (WASM-owned) --
  generateId(): string;
  generateOpId(): string;

  // -- Clock seeding (one-time init at handoff) --
  setNodeClock(value: number): void;
  setOpClock(value: number): void;

  /** Free WASM memory. */
  free(): void;
}

/**
 * Interface for the WASM-backed RoomStorageEngine.
 * Matches the wasm_bindgen exports from `RoomStorageEngineHandle`.
 */
export interface RoomStorageEngineJS {
  // -- onDispatch helpers ---
  onDispatchOutsideBatch(reverse: unknown): void;
  batchAccumulate(ops: unknown, reverse: unknown): void;
  addToUndoStack(frames: unknown): void;

  // -- Undo/redo ---
  undo(): unknown;
  redo(): unknown;
  pushRedo(frames: unknown): void;
  pushUndo(frames: unknown): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  saveUndoCheckpoint(): number;
  restoreUndoCheckpoint(checkpoint: number): void;

  // -- History pause/resume ---
  pauseHistory(): void;
  resumeHistory(): void;

  // -- Batch ---
  startBatch(): void;
  endBatch(): { ops: unknown[]; reverse: unknown[]; hadOps: boolean } | undefined;

  // -- Unacked ops ---
  trackUnackedOp(opId: string, op: unknown): void;
  classifyRemoteOp(op: unknown): "ours" | "theirs";
  hasUnackedOps(): boolean;
  getUnackedOps(): unknown[];

  // -- Storage status ---
  storageSyncStatus(rootLoaded: boolean, requested: boolean): string;

  // -- DevTools ---
  getUndoStack(): unknown;

  // -- Cleanup ---
  free(): void;
}

/**
 * The computation-heavy CRDT functions that can be backed by WASM.
 * Both the JS and WASM implementations expose this same interface.
 */
export interface CrdtEngine {
  /** Which backend is active */
  readonly backend: "wasm" | "js";

  /** Compute a fractional position string */
  makePosition(before?: string, after?: string): string;

  /** Compute diff operations between two serialized snapshots */
  getTreesDiffOperations(
    currentItems: NodeMap,
    newItems: NodeMap
  ): Op[];

  /** Deserialize a storage snapshot into a NodeMap */
  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap;

  /** Create a persistent document shadow for fast reconnect diffs. */
  createDocumentShadow?(): CrdtDocumentShadow;

  /** Create a room storage engine for undo/redo, batch, unacked ops. */
  createStorageEngine?(): RoomStorageEngineJS | undefined;
}

/**
 * The selected engine. Once set, immutable for the lifetime of the process.
 */
let selectedEngine: CrdtEngine | null = null;

/**
 * Get the active CRDT engine.
 *
 * Returns the engine set via `_setEngine()`, or the provided JS engine
 * if no engine was explicitly set. The first call locks in the choice
 * permanently.
 *
 * The JS engine is provided by the caller (the wasm-adapter module)
 * to avoid circular dependencies.
 */
export function getEngine(jsEngine: CrdtEngine): CrdtEngine {
  if (selectedEngine !== null) {
    return selectedEngine;
  }

  // No engine was explicitly set — lock in JS.
  selectedEngine = jsEngine;
  return selectedEngine;
}

/**
 * Set the engine. Once set to a non-null value, the engine is
 * immutable — subsequent calls are ignored.
 * @internal
 */
export function _setEngine(engine: CrdtEngine | null): void {
  if (selectedEngine !== null) {
    return;
  }
  selectedEngine = engine;
}

/**
 * Opaque type for the WASM DocumentHandle — actual type is from wasm-bindgen.
 */
interface WasmDocumentHandle {
  getTreesDiffOperations(newItems: unknown): unknown;
  initFromItems(items: unknown): void;
  applyOp(op: unknown, source: string): unknown;
  applyOps(ops: unknown, source: string): unknown;
  setConnectionId(id: number): void;
  serialize(): unknown;
  toPlainLson(): unknown;

  // Handle lookup by node ID
  getObjectById(id: string): WasmLiveObjectHandle | undefined;
  getListById(id: string): WasmLiveListHandle | undefined;
  getMapById(id: string): WasmLiveMapHandle | undefined;

  // ID generation
  generateId(): string;
  generateOpId(): string;

  // Clock access
  readonly nodeClock: number;
  readonly opClock: number;
  setNodeClock(value: number): void;
  setOpClock(value: number): void;

  free(): void;
}

interface WasmLiveObjectHandle {
  update(data: unknown): unknown;
  delete(key: string): unknown;
  free(): void;
}

interface WasmLiveListHandle {
  push(v: unknown): unknown;
  insert(v: unknown, i: number): unknown;
  move(f: number, t: number): unknown;
  delete(i: number): unknown;
  set(i: number, v: unknown): unknown;
  clear(): unknown;
  free(): void;
}

interface WasmLiveMapHandle {
  set(k: string, v: unknown): unknown;
  delete(k: string): unknown;
  free(): void;
}

/**
 * Create a WASM-backed engine from a loaded WASM module.
 * Called by the test setup or production initialization code.
 */
export function createWasmEngine(_module: unknown): CrdtEngine {
  const mod = _module as {
    makePosition: (before?: string, after?: string) => string;
    DocumentHandle: {
      new (): WasmDocumentHandle;
      fromItems: (items: unknown) => WasmDocumentHandle;
    };
    RoomStorageEngineHandle?: {
      new (): RoomStorageEngineJS;
    };
  };

  return {
    backend: "wasm",

    makePosition(before?: string, after?: string): string {
      return mod.makePosition(before, after);
    },

    getTreesDiffOperations(
      currentItems: NodeMap,
      newItems: NodeMap
    ): Op[] {
      const currentTuples = Array.from(currentItems.entries());
      const newTuples = Array.from(newItems.entries());

      const doc = mod.DocumentHandle.fromItems(currentTuples);
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return doc.getTreesDiffOperations(newTuples) as Op[];
      } finally {
        doc.free();
      }
    },

    deserializeItems(
      items: IdTuple<SerializedCrdt>[]
    ): NodeMap {
      return new Map(items);
    },

    createDocumentShadow(): CrdtDocumentShadow {
      const handle: WasmDocumentHandle = new mod.DocumentHandle();

      function withObjectHandle<T>(nodeId: string, fn: (h: WasmLiveObjectHandle) => T): T {
        const obj = handle.getObjectById(nodeId);
        if (!obj) throw new Error(`LiveObject node ${nodeId} not found`);
        try { return fn(obj); } finally { obj.free(); }
      }

      function withListHandle<T>(nodeId: string, fn: (h: WasmLiveListHandle) => T): T {
        const list = handle.getListById(nodeId);
        if (!list) throw new Error(`LiveList node ${nodeId} not found`);
        try { return fn(list); } finally { list.free(); }
      }

      function withMapHandle<T>(nodeId: string, fn: (h: WasmLiveMapHandle) => T): T {
        const map = handle.getMapById(nodeId);
        if (!map) throw new Error(`LiveMap node ${nodeId} not found`);
        try { return fn(map); } finally { map.free(); }
      }

      return {
        initFromItems(items: IdTuple<SerializedCrdt>[]): void {
          handle.initFromItems(items);
        },
        applyOp(op: Op, source: "local" | "ours" | "theirs"): void {
          handle.applyOp(op, source);
        },
        applyOps(ops: readonly Op[], source: "local" | "ours" | "theirs"): void {
          handle.applyOps(ops, source);
        },
        diffAgainstSnapshot(newItems: IdTuple<SerializedCrdt>[]): Op[] {
          return handle.getTreesDiffOperations(newItems) as Op[];
        },
        setConnectionId(id: number): void {
          handle.setConnectionId(id);
        },

        // -- Mutation delegation --
        objectUpdate(nodeId: string, data: unknown): unknown {
          return withObjectHandle(nodeId, (h) => h.update(data));
        },
        objectDelete(nodeId: string, key: string): unknown {
          return withObjectHandle(nodeId, (h) => h.delete(key));
        },
        listPush(nodeId: string, value: unknown): unknown {
          return withListHandle(nodeId, (h) => h.push(value));
        },
        listInsert(nodeId: string, value: unknown, index: number): unknown {
          return withListHandle(nodeId, (h) => h.insert(value, index));
        },
        listMove(nodeId: string, from: number, to: number): unknown {
          return withListHandle(nodeId, (h) => h.move(from, to));
        },
        listDelete(nodeId: string, index: number): unknown {
          return withListHandle(nodeId, (h) => h.delete(index));
        },
        listSet(nodeId: string, index: number, value: unknown): unknown {
          return withListHandle(nodeId, (h) => h.set(index, value));
        },
        listClear(nodeId: string): unknown {
          return withListHandle(nodeId, (h) => h.clear());
        },
        mapSet(nodeId: string, key: string, value: unknown): unknown {
          return withMapHandle(nodeId, (h) => h.set(key, value));
        },
        mapDelete(nodeId: string, key: string): unknown {
          return withMapHandle(nodeId, (h) => h.delete(key));
        },

        // -- ID generation --
        generateId(): string {
          return handle.generateId();
        },
        generateOpId(): string {
          return handle.generateOpId();
        },

        // -- Clock seeding --
        setNodeClock(value: number): void {
          handle.setNodeClock(value);
        },
        setOpClock(value: number): void {
          handle.setOpClock(value);
        },

        free(): void {
          handle.free();
        },
      };
    },

    createStorageEngine(): RoomStorageEngineJS | undefined {
      if (mod.RoomStorageEngineHandle) {
        return new mod.RoomStorageEngineHandle();
      }
      return undefined;
    },
  };
}
