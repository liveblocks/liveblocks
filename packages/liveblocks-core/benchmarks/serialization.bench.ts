/**
 * Serialization benchmark: JS vs WASM snapshot deserialization and
 * round-trip (deserialize → serialize).
 */
import { bench, describe } from "vitest";

import type { IdTuple, SerializedCrdt } from "../src/protocol/SerializedCrdt";
import { CrdtType } from "../src/protocol/SerializedCrdt";
import { generateNodeMap, jsEngine, loadWasmEngine } from "./setup";

// Generate snapshot data at various sizes
const sizes = [100, 1_000, 5_000, 10_000];

const snapshots = sizes.map((size) => {
  const nodeMap = generateNodeMap(size);
  const items: IdTuple<SerializedCrdt>[] = Array.from(nodeMap.entries());
  return { size, items };
});

describe("deserializeItems", async () => {
  const wasmEngine = await loadWasmEngine();

  for (const { size, items } of snapshots) {
    bench(`JS - deserialize ${size} nodes`, () => {
      jsEngine.deserializeItems(items);
    });

    if (wasmEngine) {
      bench(`WASM - deserialize ${size} nodes`, () => {
        wasmEngine.deserializeItems(items);
      });
    }
  }
});

describe("full round-trip (fromItems + serialize)", async () => {
  let wasmMod: {
    DocumentHandle: {
      fromItems: (items: unknown) => { serialize: () => unknown; free: () => void };
    };
  } | null = null;

  try {
    wasmMod = (await import(
      "../../liveblocks-wasm/pkg-node/liveblocks_wasm.js"
    )) as typeof wasmMod;
  } catch {
    // WASM not available
  }

  for (const { size, items } of snapshots) {
    bench(`JS - round-trip ${size} nodes`, () => {
      // JS just creates a Map (no deeper deserialization)
      const map = new Map(items);
      Array.from(map.entries());
    });

    if (wasmMod) {
      bench(`WASM - round-trip ${size} nodes`, () => {
        const doc = wasmMod!.DocumentHandle.fromItems(items);
        try {
          doc.serialize();
        } finally {
          doc.free();
        }
      });
    }
  }
});
