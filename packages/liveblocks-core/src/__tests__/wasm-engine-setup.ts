/**
 * Vitest setup file for WASM engine integration.
 *
 * When the environment variable LIVEBLOCKS_ENGINE=wasm is set, this setup
 * loads the real WASM binary and calls _setEngine() so that all subsequent
 * createHistoryEngine() calls (from room.ts) return WasmHistoryEngine
 * instead of JSHistoryEngine.
 *
 * Usage:
 *   LIVEBLOCKS_ENGINE=wasm npx vitest run
 *
 * Without the env var (or with LIVEBLOCKS_ENGINE=js), this file is a no-op
 * and the JS engine is used as normal.
 */

import type { CrdtEngine, RoomStorageEngineJS } from "../crdts/impl-selector";
import { _setEngine } from "../crdts/impl-selector";
import type { Op } from "../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../protocol/SerializedCrdt";
import type { NodeMap } from "../types/NodeMap";

if (process.env.LIVEBLOCKS_ENGINE === "wasm") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const path = require("path");
    // Resolve relative to this file's location to work regardless of cwd.
    // This file: packages/liveblocks-core/src/__tests__/wasm-engine-setup.ts
    // Target:    packages/liveblocks-wasm/pkg/liveblocks_wasm.js
    const pkgPath = path.resolve(
      __dirname,
      "../../../liveblocks-wasm/pkg/liveblocks_wasm.js"
    );
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const wasmPkg = require(pkgPath) as {
      makePosition: (before?: string | null, after?: string | null) => string;
      DocumentHandle: {
        new (): WasmDocumentHandle;
        fromItems: (items: unknown) => WasmDocumentHandle;
      };
      RoomStorageEngineHandle: {
        new (): RoomStorageEngineJS;
      };
    };

    if (typeof wasmPkg.RoomStorageEngineHandle !== "function") {
      throw new Error(
        "WASM module loaded but RoomStorageEngineHandle not found"
      );
    }

    const wasmEngine: CrdtEngine = {
      backend: "wasm",

      makePosition(before?: string, after?: string): string {
        return wasmPkg.makePosition(before ?? null, after ?? null);
      },

      getTreesDiffOperations(
        currentItems: NodeMap,
        newItems: NodeMap
      ): Op[] {
        const currentTuples = Array.from(currentItems.entries());
        const newTuples = Array.from(newItems.entries());
        const doc = wasmPkg.DocumentHandle.fromItems(currentTuples);
        try {
          return doc.getTreesDiffOperations(newTuples) as Op[];
        } finally {
          doc.free();
        }
      },

      deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
        return new Map(items);
      },

      createDocumentShadow() {
        const handle = new wasmPkg.DocumentHandle();
        return {
          initFromItems(items: IdTuple<SerializedCrdt>[]) {
            handle.initFromItems(items);
          },
          applyOp(op: Op, source: "local" | "ours" | "theirs") {
            handle.applyOp(op, source);
          },
          applyOps(ops: readonly Op[], source: "local" | "ours" | "theirs") {
            handle.applyOps(ops, source);
          },
          diffAgainstSnapshot(newItems: IdTuple<SerializedCrdt>[]): Op[] {
            return handle.getTreesDiffOperations(newItems) as Op[];
          },
          setConnectionId(id: number) {
            handle.setConnectionId(id);
          },
          free() {
            handle.free();
          },
        };
      },

      createStorageEngine(): RoomStorageEngineJS {
        return new wasmPkg.RoomStorageEngineHandle();
      },
    };

    _setEngine(wasmEngine, /* lock */ true);
    console.log(
      "[wasm-engine-setup] WASM engine loaded and locked as active engine"
    );
  } catch (e) {
    console.error(
      "[wasm-engine-setup] LIVEBLOCKS_ENGINE=wasm but WASM loading failed:",
      (e as Error).message
    );
    // Fail loudly — if user explicitly requested WASM, don't silently fall back
    throw e;
  }
}

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
