/**
 * Behavioral equivalence test setup.
 *
 * Provides helpers for parameterizing tests to run against both the JS
 * (pure TypeScript) and WASM implementations. This ensures the WASM
 * implementation produces identical results to the JS implementation.
 */

import { _resetForTesting } from "../../crdts/impl-selector";
import { getTreesDiffOperations as jsGetTreesDiffOperations } from "../../crdts/liveblocks-helpers";
import {
  deserializeItems,
  getTreesDiffOperations,
  makePosition,
} from "../../crdts/wasm-adapter";
import type { Pos } from "../../lib/position";
import { makePosition as jsMakePosition } from "../../lib/position";
import type { Op } from "../../protocol/Op";
import type { IdTuple, SerializedCrdt } from "../../protocol/SerializedCrdt";
import type { NodeMap } from "../../types/NodeMap";

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
 * When WASM is loaded, this will use the WASM implementation;
 * otherwise it falls back to JS (same as jsTestEngine).
 */
export const adapterTestEngine: TestEngine = {
  name: "Adapter",

  makePosition(before?: string, after?: string): string {
    return makePosition(before, after);
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
 * Both the direct JS implementation and the wasm-adapter are included.
 * When WASM is available, the adapter engine will use WASM; otherwise both
 * engines will use JS (verifying the adapter's fallback path is correct).
 */
export function getTestEngines(): TestEngine[] {
  return [jsTestEngine, adapterTestEngine];
}

/**
 * Helper to run a describe block for each engine.
 * Usage:
 * ```
 * describeForEachEngine((engine) => {
 *   test("my test", () => {
 *     const result = engine.makePosition();
 *     expect(result).toBe("!");
 *   });
 * });
 * ```
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

/**
 * Reset all engine state (call in afterEach to ensure clean state).
 */
export function resetEngine(): void {
  _resetForTesting();
}
