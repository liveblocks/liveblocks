/**
 * Tree diff benchmark: JS vs WASM getTreesDiffOperations.
 *
 * Tests with varying tree sizes and change percentages.
 * Includes both the throwaway-handle path and the persistent shadow path.
 */
import { bench, describe } from "vitest";

import type { IdTuple, SerializedCrdt } from "../src/protocol/StorageNode";
import { generateNodeMap, jsEngine, loadWasmEngine, loadWasmShadow, mutateNodeMap } from "./setup";

// Pre-generate test data at various sizes
const sizes = [100, 500, 1_000, 5_000, 10_000];
const changePercent = 5;

const testData = sizes.map((size) => {
  const current = generateNodeMap(size);
  const mutated = mutateNodeMap(current, changePercent);
  const currentTuples: IdTuple<SerializedCrdt>[] = Array.from(current.entries());
  const mutatedTuples: IdTuple<SerializedCrdt>[] = Array.from(mutated.entries());
  return { size, current, mutated, currentTuples, mutatedTuples };
});

describe("getTreesDiffOperations", async () => {
  const wasmEngine = await loadWasmEngine();

  for (const { size, current, mutated } of testData) {
    bench(`JS - ${size} nodes, ${changePercent}% changed`, () => {
      jsEngine.getTreesDiffOperations(current, mutated);
    });

    if (wasmEngine) {
      bench(`WASM - ${size} nodes, ${changePercent}% changed`, () => {
        wasmEngine.getTreesDiffOperations(current, mutated);
      });
    }
  }
});

describe("getTreesDiffOperations (persistent shadow)", async () => {
  const shadow = await loadWasmShadow();

  for (const { size, current, currentTuples, mutatedTuples } of testData) {
    bench(`JS - ${size} nodes, ${changePercent}% changed`, () => {
      jsEngine.getTreesDiffOperations(current, new Map(mutatedTuples));
    });

    if (shadow) {
      // Initialize shadow once per size before benchmarking
      shadow.initFromItems(currentTuples);

      bench(`WASM shadow - ${size} nodes, ${changePercent}% changed`, () => {
        // Only the diff call is measured — shadow is pre-loaded
        shadow.diffAgainstSnapshot(mutatedTuples);
      });
    }
  }
});
