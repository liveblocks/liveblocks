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

import type { CrdtDocumentOwner, CrdtEngine, CrdtEntry, OwnedApplyResult, RoomStorageEngineJS } from "../crdts/impl-selector";
import { _setEngine } from "../crdts/impl-selector";
import type { Op } from "../protocol/Op";
import type { IdTuple, NodeMap, SerializedCrdt } from "../protocol/StorageNode";

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

      createDocumentShadow(): CrdtDocumentOwner {
        const handle = new wasmPkg.DocumentHandle();

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

          // Mutation delegation
          objectUpdate(nodeId: string, data: unknown) {
            return withObjectHandle(nodeId, (h) => h.update(data));
          },
          objectDelete(nodeId: string, key: string) {
            return withObjectHandle(nodeId, (h) => h.delete(key));
          },
          listPush(nodeId: string, value: unknown) {
            return withListHandle(nodeId, (h) => h.push(value));
          },
          listInsert(nodeId: string, value: unknown, index: number) {
            return withListHandle(nodeId, (h) => h.insert(value, index));
          },
          listMove(nodeId: string, from: number, to: number) {
            return withListHandle(nodeId, (h) => h.move(from, to));
          },
          listDelete(nodeId: string, index: number) {
            return withListHandle(nodeId, (h) => h.delete(index));
          },
          listSet(nodeId: string, index: number, value: unknown) {
            return withListHandle(nodeId, (h) => h.set(index, value));
          },
          listClear(nodeId: string) {
            return withListHandle(nodeId, (h) => h.clear());
          },
          mapSet(nodeId: string, key: string, value: unknown) {
            return withMapHandle(nodeId, (h) => h.set(key, value));
          },
          mapDelete(nodeId: string, key: string) {
            return withMapHandle(nodeId, (h) => h.delete(key));
          },

          // Read delegation
          listLength(nodeId: string) { return handle.listLength(nodeId); },
          listGetEntry(nodeId: string, index: number) {
            return handle.listGetEntry(nodeId, index) as CrdtEntry | undefined;
          },
          listEntries(nodeId: string) {
            return (handle.listEntries(nodeId) ?? []) as CrdtEntry[];
          },
          listToImmutable(nodeId: string) { return handle.listToImmutable(nodeId); },
          listDebugPositions(nodeId: string) { return handle.listDebugPositions(nodeId); },
          objectGetEntry(nodeId: string, key: string) {
            return handle.objectGetEntry(nodeId, key) as CrdtEntry | undefined;
          },
          objectKeys(nodeId: string) {
            return (handle.objectKeys(nodeId) ?? []) as string[];
          },
          objectEntries(nodeId: string) {
            return (handle.objectEntries(nodeId) ?? []) as [string, CrdtEntry][];
          },
          objectToImmutable(nodeId: string) { return handle.objectToImmutable(nodeId); },
          mapGetEntry(nodeId: string, key: string) {
            return handle.mapGetEntry(nodeId, key) as CrdtEntry | undefined;
          },
          mapHas(nodeId: string, key: string) { return handle.mapHas(nodeId, key); },
          mapSize(nodeId: string) { return handle.mapSize(nodeId); },
          mapKeys(nodeId: string) {
            return (handle.mapKeys(nodeId) ?? []) as string[];
          },
          mapEntries(nodeId: string) {
            return (handle.mapEntries(nodeId) ?? []) as [string, CrdtEntry][];
          },
          mapToImmutable(nodeId: string) { return handle.mapToImmutable(nodeId); },

          // Node structure
          getNodeType(nodeId: string) {
            return handle.getNodeType(nodeId) as string | undefined;
          },
          getParentInfo(nodeId: string) {
            return handle.getParentInfo(nodeId) as { parentId: string; parentKey: string } | undefined;
          },

          // Enhanced applyOp
          applyOpOwned(op: Op, source: "local" | "ours" | "theirs") {
            return handle.applyOpOwned(op, source) as OwnedApplyResult;
          },

          // ID generation
          generateId() { return handle.generateId(); },
          generateOpId() { return handle.generateOpId(); },
          setNodeClock(value: number) { handle.setNodeClock(value); },
          setOpClock(value: number) { handle.setOpClock(value); },

          free() {
            handle.free();
          },
        };
      },

      createStorageEngine(): RoomStorageEngineJS {
        return new wasmPkg.RoomStorageEngineHandle();
      },
    };

    _setEngine(wasmEngine);
    console.log(
      "[wasm-engine-setup] WASM engine loaded and set as active engine"
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
  applyOpOwned(op: unknown, source: string): unknown;
  setConnectionId(id: number): void;
  serialize(): unknown;
  toPlainLson(): unknown;

  // Handle lookup
  getObjectById(id: string): WasmLiveObjectHandle | undefined;
  getListById(id: string): WasmLiveListHandle | undefined;
  getMapById(id: string): WasmLiveMapHandle | undefined;

  // Read delegation APIs
  getNodeType(id: string): unknown;
  getParentInfo(id: string): unknown;
  listLength(listId: string): number;
  listGetEntry(listId: string, index: number): unknown;
  listEntries(listId: string): unknown;
  listToImmutable(listId: string): unknown;
  listDebugPositions(listId: string): unknown;
  objectGetEntry(objId: string, key: string): unknown;
  objectKeys(objId: string): unknown;
  objectEntries(objId: string): unknown;
  objectToImmutable(objId: string): unknown;
  mapGetEntry(mapId: string, key: string): unknown;
  mapHas(mapId: string, key: string): boolean;
  mapSize(mapId: string): number;
  mapKeys(mapId: string): unknown;
  mapEntries(mapId: string): unknown;
  mapToImmutable(mapId: string): unknown;

  // ID generation
  generateId(): string;
  generateOpId(): string;
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
