import { afterEach, describe, expect, test, vi } from "vitest";

const WASM_LOCKED = process.env.LIVEBLOCKS_ENGINE === "wasm";

import type { CrdtEngine } from "../../crdts/impl-selector";
import {
  _setEngine,
  _resetForTesting,
  getEngine,
  initWasm,
  isWasmAvailable,
  isWasmReady,
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

afterEach(() => {
  // Reset all internal state between tests
  _resetForTesting();
});

describe("isWasmAvailable", () => {
  test("returns true when WebAssembly is available", () => {
    // jsdom (vitest default) includes WebAssembly
    expect(isWasmAvailable()).toBe(true);
  });
});

describe("getEngine", () => {
  test.skipIf(WASM_LOCKED)("returns passed-in JS engine before init settles (no caching)", () => {
    const jsEngine1 = makeStubEngine("js");
    const jsEngine2 = makeStubEngine("js");
    // Before initWasm() has settled, getEngine returns whatever is passed in
    expect(getEngine(jsEngine1)).toBe(jsEngine1);
    expect(getEngine(jsEngine2)).toBe(jsEngine2);
  });

  test.skipIf(WASM_LOCKED)("locks in JS engine after init settles with no WASM", async () => {
    // initWasm() will fail to load the WASM package in tests, settling as JS
    await initWasm();

    const jsEngine1 = makeStubEngine("js");
    const jsEngine2 = makeStubEngine("js");
    const engine1 = getEngine(jsEngine1);
    const engine2 = getEngine(jsEngine2);
    // After init settles, the engine is cached permanently
    expect(engine1).toBe(jsEngine1);
    expect(engine2).toBe(engine1);
  });

  test("caches the selected engine on subsequent calls after init", async () => {
    await initWasm();

    const jsEngine = makeStubEngine("js");
    const engine1 = getEngine(jsEngine);
    const engine2 = getEngine(jsEngine);
    expect(engine1).toBe(engine2);
  });
});

describe("_setEngine", () => {
  test("overrides the engine selection", () => {
    const jsEngine = makeStubEngine("js");
    const wasmEngine = makeStubEngine("wasm");

    // Force WASM engine via _setEngine
    _setEngine(wasmEngine);

    const engine = getEngine(jsEngine);
    expect(engine.backend).toBe("wasm");
    expect(engine).toBe(wasmEngine);
  });

  test("setting to null clears the override", () => {
    const wasmEngine = makeStubEngine("wasm");
    _setEngine(wasmEngine);
    expect(getEngine(makeStubEngine("js"))).toBe(wasmEngine);

    _setEngine(null);

    // Now it should return whatever is passed in (init hasn't settled)
    const freshJsEngine = makeStubEngine("js");
    const engine = getEngine(freshJsEngine);
    expect(engine).toBe(freshJsEngine);
  });
});

describe("isWasmReady", () => {
  test("returns false before WASM is loaded", () => {
    expect(isWasmReady()).toBe(false);
  });
});

describe("CrdtEngine interface", () => {
  test("JS engine exposes all required methods", () => {
    const engine = makeStubEngine("js");
    expect(engine.backend).toBe("js");
    expect(typeof engine.makePosition).toBe("function");
    expect(typeof engine.getTreesDiffOperations).toBe("function");
    expect(typeof engine.deserializeItems).toBe("function");
  });

  test("WASM engine exposes all required methods", () => {
    const engine = makeStubEngine("wasm");
    expect(engine.backend).toBe("wasm");
    expect(typeof engine.makePosition).toBe("function");
    expect(typeof engine.getTreesDiffOperations).toBe("function");
    expect(typeof engine.deserializeItems).toBe("function");
  });
});
