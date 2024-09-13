import { createStore } from "../create-store";

describe("createStore", () => {
  test("should notify subscriber right after subscribing", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1); // XXX Weird! This is not the behavior that uSES expects
  });

  test("should notify subscriber when state is updated via callback", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1); // XXX Weird! This is not the behavior that uSES expects

    store.set((state) => ({ ...state }));

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("should only notify subscriber if state reference changes", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1);

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

    expect(fn).toHaveBeenCalledTimes(4);
  });

  test("batching will only notify once", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1);

    store.batch(() => {
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

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("nesting batches has no effect (only the outer batch counts)", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1);

    store.batch(() => {
      store.set((state) => state);
      store.set((state) => ({ ...state, x: 0 }));
      store.set((state) => state);

      store.batch(() => {
        store.set((state) => ({ ...state, x: 1 }));
        store.set((state) => ({ ...state, x: 2 }));

        store.batch(() => {
          store.set((state) => ({ ...state, x: 3 }));
        });

        store.set((state) => state);
        store.set((state) => state);
      });
    });

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
