import { describe, expect, test, vi } from "vitest";

const IS_WASM = process.env.LIVEBLOCKS_ENGINE === "wasm";

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
  test("returns a consistent engine on subsequent calls", () => {
    const jsEngine = makeStubEngine("js");
    const engine1 = getEngine(jsEngine);
    const engine2 = getEngine(jsEngine);
    expect(engine1).toBe(engine2);
  });
});

describe("engine immutability", () => {
  test("once set, the engine cannot be changed", () => {
    const jsEngine = makeStubEngine("js");

    // Ensure the engine is set (in WASM mode it's already set by setup,
    // in JS mode getEngine locks in JS on first call).
    const engine1 = getEngine(jsEngine);

    // Attempt to override — should be ignored
    _setEngine(makeStubEngine("wasm"));
    const engine2 = getEngine(jsEngine);

    expect(engine2).toBe(engine1);
  });

  test("_setEngine(null) is ignored once engine is set", () => {
    const jsEngine = makeStubEngine("js");
    const engine = getEngine(jsEngine);

    _setEngine(null);
    expect(getEngine(jsEngine)).toBe(engine);
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
