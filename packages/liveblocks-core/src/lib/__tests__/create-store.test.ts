import { createStore } from "../create-store";

describe("createStore", () => {
  test("should notify subscriber right after subscribing", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledWith({ x: 0 });
  });

  test("should notify subscriber when state is updated via callback", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    store.set(({ x }) => ({ x: x + 1 }));

    expect(fn).toHaveBeenCalledWith({ x: 1 });
  });

  test("should not notify subscriber if state reference does not change", () => {
    const fn = jest.fn();
    const store = createStore({ x: 0 });

    store.subscribe(fn);

    expect(fn).toHaveBeenCalledWith({ x: 0 });

    store.set((state) => state);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
