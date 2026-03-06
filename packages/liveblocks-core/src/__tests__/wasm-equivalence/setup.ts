/**
 * Behavioral equivalence test setup.
 *
 * Provides helpers for parameterizing tests to run against both the JS
 * (pure TypeScript) and WASM implementations. This ensures the WASM
 * implementation produces identical results to the JS implementation.
 */

import { getTreesDiffOperations as jsGetTreesDiffOperations } from "../../crdts/liveblocks-helpers";
import {
  deserializeItems,
  getTreesDiffOperations,
  makePosition,
} from "../../crdts/wasm-adapter";
import type { Pos } from "../../lib/position";
import { makePosition as jsMakePosition } from "../../lib/position";
import type { Op } from "../../protocol/Op";
import type { IdTuple, NodeMap, SerializedCrdt } from "../../protocol/StorageNode";

/**
 * A test-friendly engine interface that exposes the same operations
 * but with types convenient for testing.
 */
export interface TestEngine {
  readonly name: string;
  makePosition(before?: string, after?: string): string;
  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[];
  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap;
}

/**
 * The JS-backed test engine, using the original TypeScript implementations.
 */
export const jsTestEngine: TestEngine = {
  name: "JS",

  makePosition(before?: string, after?: string): string {
    return jsMakePosition(
      before as Pos | undefined,
      after as Pos | undefined
    );
  },

  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[] {
    return jsGetTreesDiffOperations(currentItems, newItems);
  },

  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
    return new Map(items);
  },
};

/**
 * The adapter-backed test engine, using the wasm-adapter module.
 * When WASM is set as the active engine, this will use the WASM
 * implementation; otherwise it uses JS.
 */
export const adapterTestEngine: TestEngine = {
  name: "Adapter",

  makePosition(before?: string, after?: string): string {
    return makePosition(before as Pos | undefined, after as Pos | undefined);
  },

  getTreesDiffOperations(currentItems: NodeMap, newItems: NodeMap): Op[] {
    return getTreesDiffOperations(currentItems, newItems);
  },

  deserializeItems(items: IdTuple<SerializedCrdt>[]): NodeMap {
    return deserializeItems(items);
  },
};

/**
 * Returns an array of engines to test against.
 */
export function getTestEngines(): TestEngine[] {
  return [jsTestEngine, adapterTestEngine];
}

/**
 * No-op — the engine is immutable once set.
 * Kept for backward compatibility with test files that call it in afterEach.
 */
export function resetEngine(): void {
  // Engine is immutable — nothing to reset.
}

/**
 * Helper to run a describe block for each engine.
 */
export function describeForEachEngine(
  fn: (engine: TestEngine) => void
): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/consistent-type-imports
  const { describe } = require("vitest") as typeof import("vitest");
  for (const engine of getTestEngines()) {
    describe(`[${engine.name}]`, () => {
      fn(engine);
    });
  }
}
