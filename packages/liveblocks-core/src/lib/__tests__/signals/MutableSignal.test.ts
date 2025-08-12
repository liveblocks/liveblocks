import fc from "fast-check";
import { expect, test, vi } from "vitest";

import { batch, DerivedSignal, MutableSignal, Signal } from "../../signals";

const anyObject = fc
  .anything()
  .filter((x): x is object => x !== null && typeof x === "object");

test("empty", () => {
  expect(new MutableSignal({}).get()).toStrictEqual({});
  expect(new MutableSignal([1, 2, 3]).get()).toStrictEqual([1, 2, 3]);
});

test("signals always notify watchers whenever mutated (because we cannot tell if their value has changed)", () => {
  const fn = vi.fn();

  type S = { counter: 0 };

  const counter = new MutableSignal<S>({ counter: 0 });

  const inc = (state: S) => void state.counter++;

  const makeOdd = (state: S) => {
    if ((state.counter & 1) === 0) {
      state.counter++;
      return true;
    } else {
      return false;
    }
  };

  const unsub = counter.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(counter.get()).toEqual({ counter: 0 });
  expect(fn).not.toHaveBeenCalled();

  counter.mutate(inc);
  expect(counter.get()).toEqual({ counter: 1 });
  expect(fn).toHaveBeenCalledTimes(1);

  counter.mutate(makeOdd); // Won't update the state
  expect(counter.get()).toEqual({ counter: 1 });
  expect(fn).toHaveBeenCalledTimes(1);

  counter.mutate(inc);
  expect(counter.get()).toEqual({ counter: 2 });
  expect(fn).toHaveBeenCalledTimes(2);

  counter.mutate(makeOdd); // Not it _will_ update the state
  expect(counter.get()).toEqual({ counter: 3 });
  expect(fn).toHaveBeenCalledTimes(3);

  counter.mutate(makeOdd); // Won't update the state
  expect(counter.get()).toEqual({ counter: 3 });
  expect(fn).toHaveBeenCalledTimes(3);

  unsub();
});

test("signals throw when used with an async mutation function", () => {
  type S = { counter: 0 };
  const counter = new MutableSignal<S>({ counter: 0 });
  const asyncInc = (state: S) => Promise.resolve(state.counter++);
  // @ts-expect-error deliberately pass an async function
  expect(() => counter.mutate(asyncInc)).toThrow(
    "does not support async callbacks"
  );
});

test("when chained, derived signals will think the value changed", () => {
  const fruits = new MutableSignal<string[]>([]);
  const count = DerivedSignal.from(fruits, (fruits) => fruits.length);
  const str = DerivedSignal.from(fruits, (fruits) => fruits.join(","));

  expect(count.isDirty).toEqual(true);
  expect(str.isDirty).toEqual(true);
  expect(count.get()).toEqual(0);
  expect(str.get()).toEqual("");
  expect(count.isDirty).toEqual(false);
  expect(str.isDirty).toEqual(false);

  fruits.mutate((s) => {
    s.push("cherry");
    s.push("apple");
    s.push("banana");
  });

  expect(count.isDirty).toEqual(true);
  expect(str.isDirty).toEqual(true);
  expect(count.get()).toEqual(3);
  expect(str.get()).toEqual("cherry,apple,banana");

  fruits.mutate((arr) => void arr.sort());

  expect(count.get()).toEqual(3);
  expect(str.get()).toEqual("apple,banana,cherry");
});

test("when batched, derived signals will only update the value changed", () => {
  const evaled = vi.fn();
  const watcher = vi.fn();

  const fruits = new MutableSignal<string[]>([]);
  const count = new Signal<number>(0);
  const list = DerivedSignal.from(fruits, count, (arr, n) => {
    evaled();
    return arr.flatMap((x) => Array<string>(n).fill(x));
  });

  expect(list.isDirty).toEqual(true);
  expect(evaled).toHaveBeenCalledTimes(0);

  expect(list.get()).toEqual([]);

  expect(evaled).toHaveBeenCalledTimes(1);
  evaled.mockClear();

  const unsub = list.subscribe(watcher);

  // Without batching...
  fruits.mutate((f) => void f.push("🍎"));
  count.set(3);

  expect(evaled).toHaveBeenCalledTimes(2); // ...it's called 2 times
  expect(list.get()).toEqual(["🍎", "🍎", "🍎"]);

  evaled.mockClear();

  // But with batching...
  batch(() => {
    fruits.mutate((f) => void f.push("🍍"));
    count.set(2);
  });

  expect(evaled).toHaveBeenCalledTimes(1); // ...it's called only once
  expect(list.get()).toEqual(["🍎", "🍎", "🍍", "🍍"]);

  unsub();
});

test("nesting of mutations", () => {
  const evaled = vi.fn();
  const watcher = vi.fn();

  const fruits = new MutableSignal<string[]>([]);
  const count = new Signal<number>(1);
  const list = DerivedSignal.from(fruits, count, (arr, n) => {
    evaled();
    return arr.flatMap((x) => Array<string>(n).fill(x));
  });

  const unsub = list.subscribe(watcher);
  evaled.mockClear();

  // Mutate fruits using a nested mutation
  fruits.mutate((f) => {
    f.push("🍎");

    fruits.mutate((f) => {
      f.push("🍐");
    });

    fruits.mutate((f) => {
      f.push("🍌");

      fruits.mutate((f) => {
        f.push("🍉");
      });
    });
  });

  // Despite being two .mutate() calls, because of the nesting, only the
  // outermost will trigger the update / re-evaluation
  expect(list.get()).toEqual(["🍎", "🍐", "🍌", "🍉"]);
  expect(evaled).toHaveBeenCalledTimes(1); // ...it's called only once

  unsub();
});

test("[prop] whatever value you initialize it with is what comes out", () => {
  fc.assert(
    fc.property(
      anyObject,

      (value) => {
        const signal = new MutableSignal(value);
        expect(signal.get()).toBe(value);
      }
    )
  );
});

test("[prop] mutating works with any value", () => {
  fc.assert(
    fc.property(
      anyObject,
      fc.anything(),

      (init, newVal) => {
        const signal = new MutableSignal(init);
        expect(signal.get()).toBe(init);

        signal.mutate((x) => {
          // @ts-expect-error deliberately mutate
          x.whatever = newVal;
        });
        expect(signal.get()).toBe(init);

        // But the mutation happened
        expect(
          // @ts-expect-error deliberately access
          signal.get().whatever
        ).toBe(newVal);
      }
    )
  );
});
