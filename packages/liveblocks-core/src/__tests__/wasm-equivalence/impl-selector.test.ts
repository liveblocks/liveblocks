import { describe, expect, test, vi } from "vitest";

import type { CrdtEngine } from "../../crdts/impl-selector";
import {
  _setEngine,
  getEngine,
} from "../../crdts/impl-selector";

function makeStubEngine(backend: "wasm" | "js"): CrdtEngine {
  return {
    backend,
    makePosition: vi.fn((_before?: string, _after?: string) => "!"),
    getTreesDiffOperations: vi.fn(() => [] as never[]),
    deserializeItems: vi.fn(
      (items: Parameters<CrdtEngine["deserializeItems"]>[0]) => new Map(items)
    ),
  };
}

describe("getEngine", () => {
  test("returns JS fallback when no WASM engine is set", () => {
    _setEngine(null); // clear any WASM engine
    const jsEngine = makeStubEngine("js");
    expect(getEngine(jsEngine)).toBe(jsEngine);
  });

  test("returns WASM engine when set", () => {
    const jsEngine = makeStubEngine("js");
    const wasmEngine = makeStubEngine("wasm");
    _setEngine(wasmEngine);
    expect(getEngine(jsEngine)).toBe(wasmEngine);
    _setEngine(null); // cleanup
  });

  test("_setEngine(null) clears the WASM engine", () => {
    const jsEngine = makeStubEngine("js");
    const wasmEngine = makeStubEngine("wasm");
    _setEngine(wasmEngine);
    expect(getEngine(jsEngine).backend).toBe("wasm");
    _setEngine(null);
    expect(getEngine(jsEngine)).toBe(jsEngine);
  });
});

describe("CrdtEngine interface", () => {
  test("engine exposes all required methods", () => {
    const engine = makeStubEngine("js");
    expect(engine.backend).toBe("js");
    expect(typeof engine.makePosition).toBe("function");
    expect(typeof engine.getTreesDiffOperations).toBe("function");
    expect(typeof engine.deserializeItems).toBe("function");
  });
});
