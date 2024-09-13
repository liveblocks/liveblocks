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

  test("should not notify subscriber if state reference does not change", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledTimes(1);

    store.set((state) => state);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
