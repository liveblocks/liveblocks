/**
 * Benchmark setup: provides JS and WASM engines for comparative benchmarks.
 *
 * Usage:
 *   const { jsEngine, wasmEngine } = await getBenchEngines();
 *   // If wasmEngine is null, WASM is not available — skip WASM benchmarks.
 */

import type { Pos } from "../src/lib/position";
import { makePosition as jsMakePosition } from "../src/lib/position";
import type { Op } from "../src/protocol/Op";
import type { IdTuple, SerializedCrdt } from "../src/protocol/SerializedCrdt";
import { CrdtType } from "../src/protocol/SerializedCrdt";
import type { NodeMap } from "../src/types/NodeMap";
import { getTreesDiffOperations as jsGetTreesDiffOperations } from "../src/crdts/liveblocks-helpers";

export interface BenchEngine {
  readonly name: string;
  makePosition(before?: string, after?: string): string;
  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[];
  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap;
}

/**
 * JS engine using the original TypeScript implementations.
 */
export const jsEngine: BenchEngine = {
  name: "JS",
  makePosition(before?: string, after?: string): string {
    return jsMakePosition(before as Pos | undefined, after as Pos | undefined);
  },
  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[] {
    return jsGetTreesDiffOperations(currentItems, newItems);
  },
  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
    return new Map(items);
  },
};

/**
 * Try to load the WASM engine. Returns null if WASM module is unavailable.
 */
export async function loadWasmEngine(): Promise<BenchEngine | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const wasmMod = await import(
      "../../liveblocks-crdt-wasm/pkg-node/liveblocks_crdt_wasm.js"
    );
    const mod = wasmMod as {
      makePosition: (before?: string | null, after?: string | null) => string;
      DocumentHandle: {
        new (): WasmDocumentHandle;
        fromItems: (items: unknown) => WasmDocumentHandle;
      };
    };

    return {
      name: "WASM",
      makePosition(before?: string, after?: string): string {
        return mod.makePosition(before ?? null, after ?? null);
      },
      getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[] {
        const currentTuples = Array.from(currentItems.entries());
        const newTuples = Array.from(newItems.entries());
        const doc = mod.DocumentHandle.fromItems(currentTuples);
        try {
          return doc.getTreesDiffOperations(newTuples) as Op[];
        } finally {
          doc.free();
        }
      },
      deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
        return new Map(items);
      },
    };
  } catch {
    return null;
  }
}

interface WasmDocumentHandle {
  getTreesDiffOperations(newItems: unknown): unknown;
  initFromItems(items: unknown): void;
  serialize(): unknown;
  free(): void;
}

/**
 * A persistent shadow handle for benchmarking the shadow diff path.
 */
export interface BenchShadow {
  initFromItems(items: IdTuple<SerializedCrdt>[]): void;
  diffAgainstSnapshot(newItems: IdTuple<SerializedCrdt>[]): Op[];
  free(): void;
}

/**
 * Try to load a persistent WASM shadow. Returns null if WASM is unavailable.
 */
export async function loadWasmShadow(): Promise<BenchShadow | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const wasmMod = await import(
      "../../liveblocks-crdt-wasm/pkg-node/liveblocks_crdt_wasm.js"
    );
    const mod = wasmMod as {
      DocumentHandle: {
        new (): WasmDocumentHandle;
        fromItems: (items: unknown) => WasmDocumentHandle;
      };
    };
    const handle = new mod.DocumentHandle();
    return {
      initFromItems(items: IdTuple<SerializedCrdt>[]) {
        handle.initFromItems(items);
      },
      diffAgainstSnapshot(newItems: IdTuple<SerializedCrdt>[]): Op[] {
        return handle.getTreesDiffOperations(newItems) as Op[];
      },
      free() {
        handle.free();
      },
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Test data generators
// ---------------------------------------------------------------------------

/**
 * Generate a NodeMap with N nodes for benchmarking tree diff.
 * Creates a root object with child objects, lists, and registers.
 */
export function generateNodeMap(nodeCount: number): NodeMap {
  const map: NodeMap = new Map();
  map.set("root", { type: CrdtType.OBJECT, data: {} });

  let counter = 0;
  const parentIds: string[] = ["root"];

  for (let i = 0; i < nodeCount - 1; i++) {
    const id = `0:${++counter}`;
    const parentId = parentIds[i % parentIds.length]!;
    const variant = i % 4;

    if (variant === 0) {
      map.set(id, {
        type: CrdtType.OBJECT,
        parentId,
        parentKey: `obj_${i}`,
        data: { value: i, label: `item-${i}` },
      });
      parentIds.push(id);
    } else if (variant === 1) {
      map.set(id, {
        type: CrdtType.LIST,
        parentId,
        parentKey: `list_${i}`,
      });
      parentIds.push(id);
    } else if (variant === 2) {
      map.set(id, {
        type: CrdtType.MAP,
        parentId,
        parentKey: `map_${i}`,
      });
      parentIds.push(id);
    } else {
      map.set(id, {
        type: CrdtType.REGISTER,
        parentId,
        parentKey: `reg_${i}`,
        data: `value-${i}`,
      });
    }
  }

  return map;
}

/**
 * Create a mutated version of a NodeMap for benchmarking diffs.
 * Applies ~changePercent of nodes: some deleted, some added, some updated.
 */
export function mutateNodeMap(
  original: NodeMap,
  changePercent: number
): NodeMap {
  const mutated = new Map(original);
  const entries = Array.from(original.entries());
  const changesToMake = Math.floor(entries.length * (changePercent / 100));

  let newIdCounter = 10000;

  for (let i = 0; i < changesToMake; i++) {
    const action = i % 3;
    if (action === 0 && entries.length > 1) {
      // Delete a non-root node
      const idx = 1 + (i % (entries.length - 1));
      const [id] = entries[idx]!;
      mutated.delete(id);
    } else if (action === 1) {
      // Add a new node
      const newId = `1:${newIdCounter++}`;
      mutated.set(newId, {
        type: CrdtType.REGISTER,
        parentId: "root",
        parentKey: `new_${newIdCounter}`,
        data: `added-${newIdCounter}`,
      });
    } else {
      // Update an existing object's data
      const idx = 1 + (i % Math.max(1, entries.length - 1));
      const entry = entries[idx];
      if (entry) {
        const [id, node] = entry;
        if (node.type === CrdtType.OBJECT && "data" in node) {
          mutated.set(id, {
            ...node,
            data: { ...node.data, updated: true },
          });
        }
      }
    }
  }

  return mutated;
}
