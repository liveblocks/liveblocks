/**
 * Unified history/storage engine abstraction.
 *
 * Provides a single interface for undo/redo stacks, batch state, unacked ops,
 * history pause/resume, and storage status — backed by either the WASM
 * RoomStorageEngine or the existing JS data structures.
 *
 * room.ts calls this interface uniformly with no branching.
 */

import type { RoomStorageEngineJS } from "./crdts/impl-selector";
import { createStorageEngine, getBackend } from "./crdts/wasm-adapter";
import { Deque } from "./lib/Deque";
import type { JsonObject } from "./lib/Json";
import type { ClientWireOp,Op  } from "./protocol/Op";

type StorageStatus =
  | "not-loaded"
  | "loading"
  | "synchronizing"
  | "synchronized";
import { OpSource } from "./crdts/AbstractCrdt";

// ---------------------------------------------------------------------------
// Types (re-exported for room.ts to use)
// ---------------------------------------------------------------------------

export type Stackframe<P extends JsonObject> = Op | PresenceStackframe<P>;

export type PresenceStackframe<P extends JsonObject> = {
  readonly type: "presence";
  readonly data: P;
};

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * Unified engine that owns undo/redo stacks, batch ops/reverse accumulation,
 * unacked ops tracking, history pause/resume, and storage status computation.
 *
 * Both the JS and WASM implementations conform to this interface so that
 * room.ts can call a single set of methods with no if/else branching.
 */
export interface HistoryEngine<P extends JsonObject> {
  // -- onDispatch -----------------------------------------------------------
  /** Called when a dispatch happens outside a batch. Pushes reverse ops to
   *  the undo stack (respecting paused history) and clears the redo stack. */
  onDispatchOutsideBatch(reverse: Stackframe<P>[]): void;
  /** Add frames to undo stack, respecting paused history. */
  addToUndoStack(frames: Stackframe<P>[]): void;

  // -- Undo/redo ------------------------------------------------------------
  /** Pop the undo stack. Returns frames or undefined. Clears paused history. */
  undo(): Stackframe<P>[] | undefined;
  /** Pop the redo stack. Returns frames or undefined. Clears paused history. */
  redo(): Stackframe<P>[] | undefined;
  /** Push reverse frames onto the redo stack (after undo completes). */
  pushToRedo(frames: Stackframe<P>[]): void;
  /** Push reverse frames onto the undo stack (after redo completes). */
  pushToUndo(frames: Stackframe<P>[]): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  /** Snapshot undo stack length for later restore. */
  saveUndoCheckpoint(): number;
  /** Restore undo stack to a previous checkpoint. */
  restoreUndoCheckpoint(checkpoint: number): void;

  // -- History pause/resume -------------------------------------------------
  pauseHistory(): void;
  resumeHistory(): void;

  // -- Batch ----------------------------------------------------------------
  startBatch(): void;
  /** Accumulate ops and reverse into active batch (called from onDispatch). */
  batchAccumulate(ops: ClientWireOp[], reverse: Stackframe<P>[]): void;
  /** Add a single reverse frame to the active batch (e.g., presence frame). */
  batchAddReverse(frame: Stackframe<P>): void;
  /** End batch, return accumulated ops/reverse. */
  endBatch(): { ops: ClientWireOp[]; reverse: Stackframe<P>[]; hadOps: boolean } | undefined;

  // -- Unacked ops ----------------------------------------------------------
  trackUnackedOp(opId: string, op: ClientWireOp): void;
  /** Classify a remote op: returns OpSource.OURS (removes from unacked)
   *  or OpSource.THEIRS. */
  classifyRemoteOp(op: Op): OpSource;
  hasUnackedOps(): boolean;
  /** Snapshot all unacked ops (for reconnect replay). */
  snapshotUnackedOps(): Map<string, ClientWireOp>;

  // -- Storage status -------------------------------------------------------
  storageSyncStatus(rootLoaded: boolean, requested: boolean): StorageStatus;

  // -- DevTools -------------------------------------------------------------
  getUndoStack(): unknown;

  // -- Cleanup --------------------------------------------------------------
  destroy(): void;
}

// ---------------------------------------------------------------------------
// JS implementation (wraps existing data structures)
// ---------------------------------------------------------------------------

const MAX_UNDO_STACK = 50;

export class JSHistoryEngine<P extends JsonObject> implements HistoryEngine<P> {
  readonly undoStack: Stackframe<P>[][] = [];
  readonly redoStack: Stackframe<P>[][] = [];
  pausedHistory: Deque<Stackframe<P>> | null = null;
  readonly unacknowledgedOps = new Map<string, ClientWireOp>();

  private _addToRealUndoStack(frames: Stackframe<P>[]): void {
    if (this.undoStack.length >= MAX_UNDO_STACK) {
      this.undoStack.shift();
    }
    this.undoStack.push(frames);
  }

  addToUndoStack(frames: Stackframe<P>[]): void {
    if (this.pausedHistory !== null) {
      this.pausedHistory.pushLeft(frames);
    } else {
      this._addToRealUndoStack(frames);
    }
  }

  onDispatchOutsideBatch(reverse: Stackframe<P>[]): void {
    this.addToUndoStack(reverse);
    this.redoStack.length = 0;
  }

  undo(): Stackframe<P>[] | undefined {
    const frames = this.undoStack.pop();
    if (frames === undefined) return undefined;
    this.pausedHistory = null;
    return frames;
  }

  redo(): Stackframe<P>[] | undefined {
    const frames = this.redoStack.pop();
    if (frames === undefined) return undefined;
    this.pausedHistory = null;
    return frames;
  }

  pushToRedo(frames: Stackframe<P>[]): void {
    this.redoStack.push(frames);
  }

  pushToUndo(frames: Stackframe<P>[]): void {
    this.undoStack.push(frames);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  saveUndoCheckpoint(): number {
    return this.undoStack.length;
  }

  restoreUndoCheckpoint(checkpoint: number): void {
    this.undoStack.length = checkpoint;
  }

  pauseHistory(): void {
    if (this.pausedHistory === null) {
      this.pausedHistory = new Deque();
    }
  }

  resumeHistory(): void {
    const frames = this.pausedHistory;
    this.pausedHistory = null;
    if (frames !== null && frames.length > 0) {
      this._addToRealUndoStack(Array.from(frames));
    }
  }

  // -- Batch (JS accumulation via Deque) ------------------------------------
  private activeBatchOps: ClientWireOp[] | null = null;
  private activeBatchReverse: Deque<Stackframe<P>> | null = null;

  startBatch(): void {
    this.activeBatchOps = [];
    this.activeBatchReverse = new Deque();
  }

  batchAccumulate(ops: ClientWireOp[], reverse: Stackframe<P>[]): void {
    if (this.activeBatchOps) {
      for (const op of ops) {
        this.activeBatchOps.push(op);
      }
    }
    if (this.activeBatchReverse) {
      this.activeBatchReverse.pushLeft(reverse);
    }
  }

  batchAddReverse(frame: Stackframe<P>): void {
    if (this.activeBatchReverse) {
      this.activeBatchReverse.pushLeft(frame);
    }
  }

  endBatch(): { ops: ClientWireOp[]; reverse: Stackframe<P>[]; hadOps: boolean } | undefined {
    const ops = this.activeBatchOps;
    const reverseDeque = this.activeBatchReverse;
    this.activeBatchOps = null;
    this.activeBatchReverse = null;
    if (ops === null || reverseDeque === null) return undefined;

    // Clear redo stack if batch produced ops (same as original JS code)
    if (ops.length > 0) {
      this.redoStack.length = 0;
    }

    const reverse = Array.from(reverseDeque);
    return { ops, reverse, hadOps: ops.length > 0 };
  }

  // -- Unacked ops ----------------------------------------------------------

  trackUnackedOp(opId: string, op: ClientWireOp): void {
    this.unacknowledgedOps.set(opId, op);
  }

  classifyRemoteOp(op: Op): OpSource {
    if (op.opId !== undefined) {
      if (this.unacknowledgedOps.delete(op.opId)) {
        return OpSource.OURS;
      }
    }
    return OpSource.THEIRS;
  }

  hasUnackedOps(): boolean {
    return this.unacknowledgedOps.size > 0;
  }

  snapshotUnackedOps(): Map<string, ClientWireOp> {
    return new Map(this.unacknowledgedOps);
  }

  // -- Storage status -------------------------------------------------------

  storageSyncStatus(rootLoaded: boolean, requested: boolean): StorageStatus {
    if (!rootLoaded) {
      return requested ? "loading" : "not-loaded";
    }
    return this.unacknowledgedOps.size === 0 ? "synchronized" : "synchronizing";
  }

  // -- DevTools -------------------------------------------------------------

  getUndoStack(): unknown {
    // Deep clone to prevent mutation of internal state
    // eslint-disable-next-line no-restricted-syntax -- deep clone, not untrusted input
    return JSON.parse(JSON.stringify(this.undoStack));
  }

  // -- Cleanup --------------------------------------------------------------

  destroy(): void {
    // Nothing to free in JS
  }
}

// ---------------------------------------------------------------------------
// WASM implementation (delegates to RoomStorageEngineHandle)
// ---------------------------------------------------------------------------

/** @internal Exported for testing. */
export class WasmHistoryEngine<P extends JsonObject> implements HistoryEngine<P> {
  private _destroyed = false;

  constructor(private engine: RoomStorageEngineJS) {}

  onDispatchOutsideBatch(reverse: Stackframe<P>[]): void {
    if (this._destroyed) return;
    this.engine.onDispatchOutsideBatch(reverse);
  }

  addToUndoStack(frames: Stackframe<P>[]): void {
    if (this._destroyed) return;
    this.engine.addToUndoStack(frames);
  }

  undo(): Stackframe<P>[] | undefined {
    const result = this.engine.undo();
    return result === undefined ? undefined : (result as Stackframe<P>[]);
  }

  redo(): Stackframe<P>[] | undefined {
    const result = this.engine.redo();
    return result === undefined ? undefined : (result as Stackframe<P>[]);
  }

  pushToRedo(frames: Stackframe<P>[]): void {
    this.engine.pushRedo(frames);
  }

  pushToUndo(frames: Stackframe<P>[]): void {
    this.engine.pushUndo(frames);
  }

  canUndo(): boolean {
    return this.engine.canUndo();
  }

  canRedo(): boolean {
    return this.engine.canRedo();
  }

  clearHistory(): void {
    this.engine.clearHistory();
  }

  saveUndoCheckpoint(): number {
    return this.engine.saveUndoCheckpoint();
  }

  restoreUndoCheckpoint(checkpoint: number): void {
    this.engine.restoreUndoCheckpoint(checkpoint);
  }

  pauseHistory(): void {
    this.engine.pauseHistory();
  }

  resumeHistory(): void {
    this.engine.resumeHistory();
  }

  startBatch(): void {
    this.engine.startBatch();
  }

  batchAccumulate(ops: ClientWireOp[], reverse: Stackframe<P>[]): void {
    this.engine.batchAccumulate(ops, reverse);
  }

  batchAddReverse(frame: Stackframe<P>): void {
    // Delegate to batchAccumulate with empty ops, wrapping the single frame
    this.engine.batchAccumulate([], [frame]);
  }

  endBatch(): { ops: ClientWireOp[]; reverse: Stackframe<P>[]; hadOps: boolean } | undefined {
    const result = this.engine.endBatch();
    if (result === undefined) return undefined;
    return {
      ops: result.ops as ClientWireOp[],
      reverse: result.reverse as Stackframe<P>[],
      hadOps: result.hadOps,
    };
  }

  trackUnackedOp(opId: string, op: ClientWireOp): void {
    if (this._destroyed) return;
    try {
      this.engine.trackUnackedOp(opId, op);
    } catch {
      // Op data may contain non-serializable values (functions, symbols, etc.)
      // that cannot cross the WASM boundary. Skip tracking — the server will
      // also reject unserializable data so this op will never be acknowledged.
    }
  }

  classifyRemoteOp(op: Op): OpSource {
    if (this._destroyed) return OpSource.THEIRS;
    const result = this.engine.classifyRemoteOp(op);
    return result === "ours" ? OpSource.OURS : OpSource.THEIRS;
  }

  hasUnackedOps(): boolean {
    if (this._destroyed) return false;
    return this.engine.hasUnackedOps();
  }

  snapshotUnackedOps(): Map<string, ClientWireOp> {
    if (this._destroyed) return new Map();
    const opsArray = this.engine.getUnackedOps() as ClientWireOp[];
    const map = new Map<string, ClientWireOp>();
    for (const op of opsArray) {
      map.set(op.opId, op);
    }
    return map;
  }

  storageSyncStatus(rootLoaded: boolean, requested: boolean): StorageStatus {
    if (this._destroyed) return "not-loaded";
    return this.engine.storageSyncStatus(rootLoaded, requested) as StorageStatus;
  }

  getUndoStack(): unknown {
    if (this._destroyed) return [];
    return this.engine.getUndoStack();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.engine.free();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a history engine based on the active backend.
 *
 * When the backend is "wasm", creates a WASM-backed engine (throws if the
 * WASM RoomStorageEngine is unavailable — no silent fallback).
 * When the backend is "js", creates a pure-JS engine.
 */
export function createHistoryEngine<P extends JsonObject>(): HistoryEngine<P> {
  const backend = getBackend();
  if (backend === "wasm") {
    const wasmEngine = createStorageEngine();
    if (!wasmEngine) {
      throw new Error(
        "WASM backend is active but createStorageEngine() returned null. " +
          "Ensure the WASM module exposes RoomStorageEngineHandle."
      );
    }
    return new WasmHistoryEngine<P>(wasmEngine);
  }
  return new JSHistoryEngine<P>();
}
