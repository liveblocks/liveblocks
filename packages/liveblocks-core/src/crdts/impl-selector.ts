/**
 * Implementation selector for CRDT operations.
 *
 * Detects WebAssembly availability and provides a unified interface
 * that delegates to either the WASM or pure JS implementation.
 *
 * IMPORTANT: `initWasm()` MUST be awaited at application startup before
 * any CRDT operations are used. The engine choice (WASM or JS) is made
 * once when initialization settles, and is permanent for the lifetime
 * of the process. There is no background loading — the caller must
 * explicitly await initialization.
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
  createStorageEngine?(): RoomStorageEngineJS;
}

let wasmModule: unknown = null;
let wasmInitPromise: Promise<boolean> | null = null;
/** True once initWasm() has resolved (regardless of success/failure). */
let initSettled = false;
/** Cached engine, set only after init has settled (or via _setEngine). */
let selectedEngine: CrdtEngine | null = null;
/** When true, _setEngine(null) and _resetForTesting() preserve the engine. */
let engineLocked = false;

/**
 * Check if WebAssembly is available in the current environment.
 */
export function isWasmAvailable(): boolean {
  return (
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function"
  );
}

/**
 * Initialize the WASM module. MUST be awaited at application startup
 * before any CRDT operations are used.
 *
 * Returns true if WASM was loaded successfully, false if falling back to JS.
 * Safe to call multiple times — subsequent calls return the cached result.
 *
 * After this resolves, all subsequent calls to `getEngine()` will return
 * the chosen engine (WASM or JS) permanently.
 */
export async function initWasm(): Promise<boolean> {
  if (wasmInitPromise !== null) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    if (!isWasmAvailable()) {
      initSettled = true;
      return false;
    }

    try {
      // Dynamic import of the WASM package.
      // Use a variable to prevent bundlers from statically resolving this.
      const wasmPkg = "liveblocks-wasm";
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      wasmModule = await import(/* @vite-ignore */ wasmPkg);
      initSettled = true;
      return true;
    } catch {
      // WASM module not available — fall back to JS
      wasmModule = null;
      initSettled = true;
      return false;
    }
  })();

  return wasmInitPromise;
}

/**
 * Check if the WASM module is initialized and ready.
 */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}

/**
 * Get the active CRDT engine.
 *
 * If `initWasm()` has settled, the engine choice is locked in permanently
 * (WASM if loaded, JS otherwise). If init has NOT settled yet, returns
 * the JS engine temporarily without caching — so that once init completes,
 * the correct engine will be picked on the next call.
 *
 * The JS engine is provided by the caller (the wasm-adapter module)
 * to avoid circular dependencies.
 */
export function getEngine(jsEngine: CrdtEngine): CrdtEngine {
  // If explicitly set (via _setEngine), always use that.
  if (selectedEngine !== null) {
    return selectedEngine;
  }

  // If init hasn't settled, return JS without caching.
  // This avoids permanently locking in JS when WASM is still loading.
  if (!initSettled) {
    return jsEngine;
  }

  // Init has settled — lock in the engine choice permanently.
  if (wasmModule !== null) {
    selectedEngine = createWasmEngine(wasmModule);
  } else {
    selectedEngine = jsEngine;
  }
  return selectedEngine;
}

/**
 * Force the engine to use a specific backend (for testing).
 * When `lock` is true, subsequent calls with null and _resetForTesting()
 * will preserve the engine — use this for global test setup (e.g., WASM mode).
 * @internal
 */
export function _setEngine(engine: CrdtEngine | null, lock = false): void {
  if (engine === null && engineLocked) {
    // Locked engine cannot be cleared — silently ignore
    return;
  }
  selectedEngine = engine;
  engineLocked = engine !== null && lock;
}

/**
 * Reset ALL internal state (for testing only).
 * Clears the cached engine, init promise, init settled flag, and WASM module.
 * If the engine is locked, it is preserved.
 * @internal
 */
export function _resetForTesting(): void {
  wasmModule = null;
  wasmInitPromise = null;
  initSettled = false;
  if (!engineLocked) {
    selectedEngine = null;
  }
}

/**
 * Create a WASM-backed engine from the loaded module.
 */
function createWasmEngine(_module: unknown): CrdtEngine {
  // The WASM module exports are typed loosely here.
  // In a full integration, we'd import the generated wasm-bindgen types.
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
      // Convert NodeMap (Map<string, SerializedCrdt>) to array of tuples
      const currentTuples = Array.from(currentItems.entries());
      const newTuples = Array.from(newItems.entries());

      // Create a WASM document from current items and compute diff
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
      // For now, WASM deserialization returns a NodeMap-compatible structure.
      // The actual tree is managed inside the WASM document.
      return new Map(items);
    },

    createDocumentShadow(): CrdtDocumentShadow {
      const handle: WasmDocumentHandle = new mod.DocumentHandle();
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
  free(): void;
}
