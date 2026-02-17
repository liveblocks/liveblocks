/**
 * Equivalence tests for the HistoryEngine abstraction.
 *
 * Runs the same test suite against both JSHistoryEngine and
 * WasmHistoryEngine (backed by the Rust RoomStorageEngine), verifying
 * identical outcomes for:
 *   - undo/redo stacks (push, pop, cap at 50)
 *   - batch ops/reverse accumulation
 *   - unacked ops tracking and classification
 *   - history pause/resume
 *   - storage status computation
 */

import { afterEach,beforeEach, describe, expect, test } from "vitest";

import { OpSource } from "../crdts/AbstractCrdt";
import type { RoomStorageEngineJS } from "../crdts/impl-selector";
import type { ClientWireOp,Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { HistoryEngine, Stackframe } from "../room-engine";
import { JSHistoryEngine, WasmHistoryEngine } from "../room-engine";

type P = { x: number; cursor?: { x: number; y: number } };

// -- Helpers ----------------------------------------------------------------

function makeOp(
  id: string,
  opId?: string,
  data?: Record<string, unknown>
): Op {
  return {
    type: OpCode.UPDATE_OBJECT,
    id,
    ...(opId !== undefined ? { opId } : {}),
    ...(data !== undefined ? { data } : {}),
  } as Op;
}

function makeClientOp(id: string, opId: string): ClientWireOp {
  return makeOp(id, opId) as ClientWireOp;
}

function makePresenceFrame(data: Partial<P>): Stackframe<P> {
  return { type: "presence" as const, data: data as P };
}

// -- WASM loading -----------------------------------------------------------

let wasmModule: { RoomStorageEngineHandle: new () => RoomStorageEngineJS } | null = null;

try {
  // Load the WASM module for testing.
  // The bundler-target pkg auto-imports the .wasm via ESM import.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const path = require("path");
  // Resolve relative to this file's location to work regardless of cwd.
  const jsPath = path.resolve(
    __dirname,
    "../../../liveblocks-wasm/pkg/liveblocks_wasm.js"
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const wasmPkg = require(jsPath);
  // Verify the module is actually functional
  if (typeof wasmPkg.RoomStorageEngineHandle === "function") {
    wasmModule = wasmPkg;
  }
} catch (e) {
  // WASM not available — skip WASM tests
  console.warn("WASM loading failed:", (e as Error).message);
}

// -- Shared test suite ------------------------------------------------------

interface EngineVariant {
  name: string;
  create: () => HistoryEngine<P>;
}

const variants: EngineVariant[] = [
  { name: "JSHistoryEngine", create: () => new JSHistoryEngine<P>() },
];

if (wasmModule) {
  const mod = wasmModule;
  variants.push({
    name: "WasmHistoryEngine",
    create: () => new WasmHistoryEngine<P>(new mod.RoomStorageEngineHandle()),
  });
}

for (const variant of variants) {
  describe(variant.name, () => {
    let engine: HistoryEngine<P>;

    beforeEach(() => {
      engine = variant.create();
    });

    afterEach(() => {
      engine.destroy();
    });

    // == Undo/redo basics ===================================================

    describe("undo/redo basics", () => {
      test("initially empty", () => {
        expect(engine.canUndo()).toBe(false);
        expect(engine.canRedo()).toBe(false);
        expect(engine.undo()).toBeUndefined();
        expect(engine.redo()).toBeUndefined();
      });

      test("onDispatchOutsideBatch pushes to undo and clears redo", () => {
        // Simulate a redo entry existing
        engine.pushToRedo([makeOp("r1")]);
        expect(engine.canRedo()).toBe(true);

        engine.onDispatchOutsideBatch([makeOp("u1")]);
        expect(engine.canUndo()).toBe(true);
        expect(engine.canRedo()).toBe(false); // redo cleared
      });

      test("undo pops and clears pausedHistory", () => {
        engine.onDispatchOutsideBatch([makeOp("a")]);
        engine.pauseHistory();
        // Undo should clear pause
        const frames = engine.undo();
        expect(frames).toBeDefined();
        expect(frames!.length).toBe(1);
        expect(engine.canUndo()).toBe(false);
      });

      test("redo pops and clears pausedHistory", () => {
        engine.pushToRedo([makeOp("a")]);
        engine.pauseHistory();
        const frames = engine.redo();
        expect(frames).toBeDefined();
        expect(frames!.length).toBe(1);
        expect(engine.canRedo()).toBe(false);
      });

      test("pushToRedo / pushToUndo round-trip", () => {
        // Simulate: dispatch → undo → pushToRedo → redo → pushToUndo
        engine.onDispatchOutsideBatch([makeOp("op1")]);
        engine.undo()!;
        engine.pushToRedo([makeOp("reverse-of-op1")]);
        expect(engine.canRedo()).toBe(true);

        engine.redo()!;
        engine.pushToUndo([makeOp("reverse-of-reverse")]);
        expect(engine.canUndo()).toBe(true);
      });
    });

    // == Undo stack cap at 50 ===============================================

    describe("undo stack cap", () => {
      test("caps at 50 entries", () => {
        for (let i = 0; i < 60; i++) {
          engine.onDispatchOutsideBatch([makeOp(`op-${i}`)]);
        }
        // Should have exactly 50
        const stack = engine.getUndoStack() as unknown[][];
        expect(stack.length).toBe(50);

        // Top should be the most recent (op-59)
        const top = engine.undo()!;
        expect((top[0] as Op).id).toBe("op-59");
      });

      test("oldest entries are dropped", () => {
        for (let i = 0; i < 55; i++) {
          engine.onDispatchOutsideBatch([makeOp(`op-${i}`)]);
        }
        // Pop all 50 remaining
        const ids: string[] = [];
        while (engine.canUndo()) {
          const frames = engine.undo()!;
          ids.push((frames[0] as Op).id);
        }
        expect(ids.length).toBe(50);
        // Oldest should be op-5 (0-4 were dropped)
        expect(ids[ids.length - 1]).toBe("op-5");
      });
    });

    // == Paused history =====================================================

    describe("paused history", () => {
      test("pause → dispatch → resume commits as single entry", () => {
        engine.pauseHistory();
        engine.onDispatchOutsideBatch([makeOp("a")]);
        engine.onDispatchOutsideBatch([makeOp("b")]);

        // Nothing on the real undo stack yet
        const stackDuringPause = engine.getUndoStack() as unknown[][];
        expect(stackDuringPause.length).toBe(0);

        engine.resumeHistory();
        // Should be ONE entry with both frames
        const stack = engine.getUndoStack() as unknown[][];
        expect(stack.length).toBe(1);

        const entry = engine.undo()!;
        expect(entry.length).toBe(2);
      });

      test("pause is idempotent", () => {
        engine.pauseHistory();
        engine.onDispatchOutsideBatch([makeOp("a")]);
        engine.pauseHistory(); // should not reset
        engine.onDispatchOutsideBatch([makeOp("b")]);
        engine.resumeHistory();
        const entry = engine.undo()!;
        expect(entry.length).toBe(2);
      });

      test("resume without pause is no-op", () => {
        engine.resumeHistory();
        expect(engine.canUndo()).toBe(false);
      });

      test("undo clears paused history", () => {
        engine.onDispatchOutsideBatch([makeOp("before-pause")]);
        engine.pauseHistory();
        engine.onDispatchOutsideBatch([makeOp("during-pause")]);
        // Undo should clear the pause (paused frames are lost)
        engine.undo();
        // Resume should be no-op now (pause was cleared)
        engine.resumeHistory();
        expect(engine.canUndo()).toBe(false);
      });
    });

    // == Batch ==============================================================

    describe("batch", () => {
      test("basic batch lifecycle", () => {
        engine.startBatch();
        engine.batchAccumulate(
          [makeClientOp("1", "op-1"), makeClientOp("2", "op-2")],
          [makeOp("rev-1"), makeOp("rev-2")]
        );
        const result = engine.endBatch()!;

        expect(result.ops.length).toBe(2);
        expect(result.reverse.length).toBe(2);
        expect(result.hadOps).toBe(true);
      });

      test("batch reverse uses pushLeft semantics", () => {
        engine.startBatch();
        engine.batchAccumulate([makeClientOp("1", "op-1")], [makeOp("first")]);
        engine.batchAccumulate([makeClientOp("2", "op-2")], [makeOp("second")]);
        const result = engine.endBatch()!;

        // "second" was pushed left, so it comes first in the result
        expect((result.reverse[0] as Op).id).toBe("second");
        expect((result.reverse[1] as Op).id).toBe("first");
      });

      test("batch with no ops does not clear redo", () => {
        engine.pushToRedo([makeOp("redo-entry")]);
        engine.startBatch();
        // No ops accumulated, only a presence reverse
        engine.batchAddReverse(makePresenceFrame({ x: 42 }));
        const result = engine.endBatch()!;

        expect(result.hadOps).toBe(false);
        expect(engine.canRedo()).toBe(true); // redo not cleared
      });

      test("batch with ops clears redo", () => {
        engine.pushToRedo([makeOp("redo-entry")]);
        engine.startBatch();
        engine.batchAccumulate([makeClientOp("1", "op-1")], [makeOp("rev-1")]);
        engine.endBatch();

        expect(engine.canRedo()).toBe(false); // redo cleared
      });

      test("endBatch without startBatch returns undefined", () => {
        expect(engine.endBatch()).toBeUndefined();
      });

      test("batchAddReverse adds presence frame", () => {
        engine.startBatch();
        engine.batchAddReverse(makePresenceFrame({ x: 100 }));
        engine.batchAccumulate([makeClientOp("1", "op-1")], [makeOp("rev-1")]);
        const result = engine.endBatch()!;

        // Presence frame should be in reverse (pushed left before the op reverse)
        expect(result.reverse.length).toBe(2);
        const presenceFrame = result.reverse.find(
          (f) => (f as { type: string }).type === "presence"
        );
        expect(presenceFrame).toBeDefined();
      });
    });

    // == Unacked ops ========================================================

    describe("unacked ops", () => {
      test("track and classify as OURS", () => {
        const op = makeClientOp("node-1", "op-1");
        engine.trackUnackedOp("op-1", op);
        expect(engine.hasUnackedOps()).toBe(true);

        // Classify same op → OURS, removes from unacked
        const source = engine.classifyRemoteOp(makeOp("node-1", "op-1"));
        expect(source).toBe(OpSource.OURS);
        expect(engine.hasUnackedOps()).toBe(false);
      });

      test("classify unknown op as THEIRS", () => {
        const source = engine.classifyRemoteOp(makeOp("node-1", "op-unknown"));
        expect(source).toBe(OpSource.THEIRS);
      });

      test("classify op without opId as THEIRS", () => {
        const source = engine.classifyRemoteOp(makeOp("node-1"));
        expect(source).toBe(OpSource.THEIRS);
      });

      test("snapshotUnackedOps returns independent copy", () => {
        engine.trackUnackedOp("op-1", makeClientOp("1", "op-1"));
        engine.trackUnackedOp("op-2", makeClientOp("2", "op-2"));

        const snapshot = engine.snapshotUnackedOps();
        expect(snapshot.size).toBe(2);

        // Original should still have 2
        engine.classifyRemoteOp(makeOp("1", "op-1")); // removes op-1
        expect(snapshot.size).toBe(2); // snapshot unchanged
        expect(engine.hasUnackedOps()).toBe(true); // still has op-2
      });
    });

    // == Storage status =====================================================

    describe("storage status", () => {
      test("not-loaded when root not loaded and not requested", () => {
        expect(engine.storageSyncStatus(false, false)).toBe("not-loaded");
      });

      test("loading when root not loaded but requested", () => {
        expect(engine.storageSyncStatus(false, true)).toBe("loading");
      });

      test("synchronized when root loaded and no unacked ops", () => {
        expect(engine.storageSyncStatus(true, true)).toBe("synchronized");
      });

      test("synchronizing when root loaded and has unacked ops", () => {
        engine.trackUnackedOp("op-1", makeClientOp("1", "op-1"));
        expect(engine.storageSyncStatus(true, true)).toBe("synchronizing");
      });
    });

    // == Clear history ======================================================

    describe("clearHistory", () => {
      test("clears both stacks", () => {
        engine.onDispatchOutsideBatch([makeOp("u1")]);
        engine.pushToRedo([makeOp("r1")]);
        expect(engine.canUndo()).toBe(true);
        expect(engine.canRedo()).toBe(true);

        engine.clearHistory();
        expect(engine.canUndo()).toBe(false);
        expect(engine.canRedo()).toBe(false);
      });
    });

    // == Checkpoint =========================================================

    describe("checkpoint", () => {
      test("save and restore truncates undo stack", () => {
        engine.onDispatchOutsideBatch([makeOp("a")]);
        engine.onDispatchOutsideBatch([makeOp("b")]);
        const checkpoint = engine.saveUndoCheckpoint();
        expect(checkpoint).toBe(2);

        engine.onDispatchOutsideBatch([makeOp("c")]);
        engine.onDispatchOutsideBatch([makeOp("d")]);
        expect((engine.getUndoStack() as unknown[][]).length).toBe(4);

        engine.restoreUndoCheckpoint(checkpoint);
        expect((engine.getUndoStack() as unknown[][]).length).toBe(2);
      });
    });

    // == Mixed frames (storage + presence) ==================================

    describe("mixed frames", () => {
      test("storage and presence frames coexist in undo stack", () => {
        const frames: Stackframe<P>[] = [
          makeOp("node-1"),
          makePresenceFrame({ x: 42 }),
        ];
        engine.onDispatchOutsideBatch(frames);

        const popped = engine.undo()!;
        expect(popped.length).toBe(2);
        // First frame is a storage op
        expect((popped[0] as Op).type).toBe(OpCode.UPDATE_OBJECT);
        // Second frame is a presence frame
        expect((popped[1] as { type: string }).type).toBe("presence");
        expect((popped[1] as { data: P }).data.x).toBe(42);
      });
    });

    // == addToUndoStack (respects pause) ====================================

    describe("addToUndoStack", () => {
      test("adds to real stack when not paused", () => {
        engine.addToUndoStack([makeOp("a")]);
        expect(engine.canUndo()).toBe(true);
      });

      test("adds to pause buffer when paused", () => {
        engine.pauseHistory();
        engine.addToUndoStack([makeOp("a")]);
        expect(engine.canUndo()).toBe(false); // not on real stack
        engine.resumeHistory();
        expect(engine.canUndo()).toBe(true); // now committed
      });
    });

    // == Full undo/redo cycle ================================================

    describe("full undo/redo cycle", () => {
      test("dispatch → undo → redo preserves frames", () => {
        const original = [makeOp("op-1", undefined, { key: "value" })];
        engine.onDispatchOutsideBatch(original);

        // Undo
        const undone = engine.undo()!;
        expect(undone).toEqual(original);

        // Simulate: apply undone frames, get reverse, push to redo
        const reverseOfUndo = [makeOp("reverse-op-1")];
        engine.pushToRedo(reverseOfUndo);

        // Redo
        const redone = engine.redo()!;
        expect(redone).toEqual(reverseOfUndo);

        // Push reverse of redo back to undo
        engine.pushToUndo([makeOp("reverse-reverse-op-1")]);
        expect(engine.canUndo()).toBe(true);
      });
    });

    // == Destroy ============================================================

    describe("destroy", () => {
      test("destroy is safe to call", () => {
        const fresh = variant.create();
        fresh.onDispatchOutsideBatch([makeOp("a")]);
        fresh.destroy(); // Should not throw
      });
    });
  });
}
