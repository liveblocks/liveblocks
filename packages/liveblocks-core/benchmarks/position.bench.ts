/**
 * Position generation benchmark: JS vs WASM makePosition.
 *
 * Tests sequential position generation (append) and between-position
 * generation (insert) at various scales.
 */
import { bench, describe } from "vitest";

import { jsEngine, loadWasmEngine } from "./setup";

describe("makePosition", async () => {
  const wasmEngine = await loadWasmEngine();

  bench("JS - 1000 sequential positions", () => {
    let last: string | undefined;
    for (let i = 0; i < 1000; i++) {
      last = jsEngine.makePosition(last);
    }
  });

  if (wasmEngine) {
    bench("WASM - 1000 sequential positions", () => {
      let last: string | undefined;
      for (let i = 0; i < 1000; i++) {
        last = wasmEngine.makePosition(last);
      }
    });
  }

  bench("JS - 1000 between positions", () => {
    let a = jsEngine.makePosition();
    let b = jsEngine.makePosition(a);
    for (let i = 0; i < 1000; i++) {
      const mid = jsEngine.makePosition(a, b);
      b = mid;
    }
  });

  if (wasmEngine) {
    bench("WASM - 1000 between positions", () => {
      let a = wasmEngine.makePosition();
      let b = wasmEngine.makePosition(a);
      for (let i = 0; i < 1000; i++) {
        const mid = wasmEngine.makePosition(a, b);
        b = mid;
      }
    });
  }
});
