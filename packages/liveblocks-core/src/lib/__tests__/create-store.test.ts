import { describe, expect, test, vi } from "vitest";

import { batch, Signal } from "../signals";

describe("Signals (previously createStore)", () => {
  test("should not notify subscriber right after subscribing", () => {
    const fn = vi.fn();
    const store = new Signal({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(0);
  });

  test("should notify subscriber when state is updated via callback", () => {
    const fn = vi.fn();
    const store = new Signal({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(0);

    store.set((state) => ({ ...state }));

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("should only notify subscriber if state reference changes", () => {
    const fn = vi.fn();
    const store = new Signal({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(0);

    store.set((state) => state);
    store.set((state) => state);
    store.set((state) => ({ ...state, x: 0 }));
    store.set((state) => state);
    store.set((state) => state);
    store.set((state) => ({ ...state, x: 1 }));
    store.set((state) => state);
    store.set((state) => state);
    store.set((state) => ({ ...state, x: 2 }));
    store.set((state) => state);
    store.set((state) => state);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("batching will only notify once", () => {
    const fn = vi.fn();
    const store = new Signal({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(0);

    batch(() => {
      store.set((state) => state);
      store.set((state) => state);
      store.set((state) => ({ ...state, x: 0 }));
      store.set((state) => state);
      store.set((state) => state);
      store.set((state) => ({ ...state, x: 1 }));
      store.set((state) => state);
      store.set((state) => state);
      store.set((state) => ({ ...state, x: 2 }));
      store.set((state) => state);
      store.set((state) => state);
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("nesting batches has no effect (only the outer batch counts)", () => {
    const fn = vi.fn();
    const store = new Signal({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(0);

    batch(() => {
      store.set((state) => state);
      store.set((state) => ({ ...state, x: 0 }));
      store.set((state) => state);

      batch(() => {
        store.set((state) => ({ ...state, x: 1 }));
        store.set((state) => ({ ...state, x: 2 }));

        batch(() => {
          store.set((state) => ({ ...state, x: 3 }));
        });

        store.set((state) => state);
        store.set((state) => state);
      });
    });

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
