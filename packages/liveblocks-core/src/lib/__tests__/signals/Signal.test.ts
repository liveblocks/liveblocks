import fc from "fast-check";

import { shallow } from "../../../lib/shallow";
import { batch, Signal } from "../../signals";

test("empty", () => {
  expect(new Signal({}).get()).toStrictEqual({});
  expect(new Signal([1, 2, 3]).get()).toStrictEqual([1, 2, 3]);
  expect(new Signal(123).get()).toBe(123);
  expect(new Signal(undefined).get()).toBe(undefined);
  expect(new Signal(null).get()).toBe(null);
});

test("with custom equals function", () => {
  const x = [1, 2, 3];
  const y = [1, 2, 3]; // Same values, but different reference

  {
    const signal = new Signal(x);
    expect(signal.get()).toBe(x);
    signal.set(y);
    expect(signal.get()).toBe(y);
  }

  {
    const signal = new Signal(x, shallow);
    //                           ^^^^^^^
    expect(signal.get()).toBe(x);
    signal.set(y);
    expect(signal.get()).toBe(x);
    //                        ^ Not y!
  }
});

it("signals only notify watchers when their value changes", () => {
  const fn = vi.fn();

  const counter = new Signal(0);

  const unsub = counter.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(counter.get()).toEqual(0);
  expect(fn).not.toHaveBeenCalled();

  counter.set(0);
  counter.get();
  expect(fn).not.toHaveBeenCalled();

  counter.set((n) => n + 1);

  unsub();
});

it("without batching three signal updates will lead to three notifications", () => {
  const fn = vi.fn();
  const x = new Signal(1);

  const unsub = x.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(x.get()).toEqual(1);

  x.set(2);
  x.set(3);
  x.set(7);

  expect(x.get()).toEqual(7);

  expect(fn).toHaveBeenCalledTimes(3);
  unsub();
});

it("batched signal updates notify only once", () => {
  const fn = vi.fn();
  const x = new Signal(1);

  const unsub = x.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(x.get()).toEqual(1);

  batch(() => {
    x.set(2);
    x.set(3);
    x.set(7);
  });

  expect(x.get()).toEqual(7);

  expect(fn).toHaveBeenCalledTimes(1); // Not 3 (!)
  unsub();
});

test("[prop] whatever value you initialize it with is what comes out", () => {
  fc.assert(
    fc.property(
      fc.anything(),

      (value) => {
        const signal = new Signal(value);
        expect(signal.get()).toBe(value);
      }
    )
  );
});

test("[prop] setting works with any value", () => {
  fc.assert(
    fc.property(
      fc.anything(),
      fc.anything(),

      (init, newVal) => {
        const signal = new Signal(init);
        expect(signal.get()).toBe(init);

        signal.set(newVal);
        expect(signal.get()).toBe(newVal);
      }
    )
  );
});

test("[prop] will freeze all given values", () => {
  fc.assert(
    fc.property(
      fc.anything().filter((x) => x !== null && x !== undefined),
      fc.anything().filter((x) => x !== null && x !== undefined),

      (init, newVal) => {
        // Freezes in constructor
        const signal = new Signal(init);
        expect(signal.get()).toBe(init);

        /* eslint-disable @typescript-eslint/no-unsafe-return */
        expect(() => {
          // @ts-expect-error - deliberately set invalid prop
          signal.get().abc = 123;
        }).toThrow(TypeError);

        // @ts-expect-error - get prop
        expect(signal.get().abc).toBe(undefined);

        // Freezes in setter
        signal.set(newVal);

        expect(() => {
          // @ts-expect-error - deliberately set invalid prop
          signal.get().xyz = 456;
        }).toThrow(TypeError);

        // @ts-expect-error - get prop
        expect(signal.get().xyz).toBe(undefined);
        /* eslint-enable @typescript-eslint/no-unsafe-return */
      }
    )
  );
});
