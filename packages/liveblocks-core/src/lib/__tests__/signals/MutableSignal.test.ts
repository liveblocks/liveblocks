import fc from "fast-check";
import { assertEq, assertSame, assertThrows } from "tosti";
import { test, vi } from "vitest";

import { batch, DerivedSignal, MutableSignal, Signal } from "../../signals";

const anyObject = fc
  .anything()
  .filter((x): x is object => x !== null && typeof x === "object");

test("empty", () => {
  assertEq(new MutableSignal({}).get(), {});
  assertEq(new MutableSignal([1, 2, 3]).get(), [1, 2, 3]);
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
  assertEq(fn.mock.calls, []);

  assertEq(counter.get(), { counter: 0 });
  assertEq(fn.mock.calls, []);

  counter.mutate(inc);
  assertEq(counter.get(), { counter: 1 });
  assertEq(fn.mock.calls.length, 1);

  counter.mutate(makeOdd); // Won't update the state
  assertEq(counter.get(), { counter: 1 });
  assertEq(fn.mock.calls.length, 1);

  counter.mutate(inc);
  assertEq(counter.get(), { counter: 2 });
  assertEq(fn.mock.calls.length, 2);

  counter.mutate(makeOdd); // Not it _will_ update the state
  assertEq(counter.get(), { counter: 3 });
  assertEq(fn.mock.calls.length, 3);

  counter.mutate(makeOdd); // Won't update the state
  assertEq(counter.get(), { counter: 3 });
  assertEq(fn.mock.calls.length, 3);

  unsub();
});

test("signals throw when used with an async mutation function", () => {
  type S = { counter: 0 };
  const counter = new MutableSignal<S>({ counter: 0 });
  const asyncInc = (state: S) => Promise.resolve(state.counter++);
  assertThrows(
    // @ts-expect-error deliberately pass an async function
    () => counter.mutate(asyncInc),
    "does not support async callbacks"
  );
});

test("when chained, derived signals will think the value changed", () => {
  const fruits = new MutableSignal<string[]>([]);
  const count = DerivedSignal.from(fruits, (fruits) => fruits.length);
  const str = DerivedSignal.from(fruits, (fruits) => fruits.join(","));

  assertEq(count.isDirty, true);
  assertEq(str.isDirty, true);
  assertEq(count.get(), 0);
  assertEq(str.get(), "");
  assertEq(count.isDirty, false);
  assertEq(str.isDirty, false);

  fruits.mutate((s) => {
    s.push("cherry");
    s.push("apple");
    s.push("banana");
  });

  assertEq(count.isDirty, true);
  assertEq(str.isDirty, true);
  assertEq(count.get(), 3);
  assertEq(str.get(), "cherry,apple,banana");

  fruits.mutate((arr) => void arr.sort());

  assertEq(count.get(), 3);
  assertEq(str.get(), "apple,banana,cherry");
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

  assertEq(list.isDirty, true);
  assertEq(evaled.mock.calls.length, 0);

  assertEq(list.get(), []);

  assertEq(evaled.mock.calls.length, 1);
  evaled.mockClear();

  const unsub = list.subscribe(watcher);

  // Without batching...
  fruits.mutate((f) => void f.push("🍎"));
  count.set(3);

  assertEq(evaled.mock.calls.length, 2); // ...it's called 2 times
  assertEq(list.get(), ["🍎", "🍎", "🍎"]);

  evaled.mockClear();

  // But with batching...
  batch(() => {
    fruits.mutate((f) => void f.push("🍍"));
    count.set(2);
  });

  assertEq(evaled.mock.calls.length, 1); // ...it's called only once
  assertEq(list.get(), ["🍎", "🍎", "🍍", "🍍"]);

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
  assertEq(list.get(), ["🍎", "🍐", "🍌", "🍉"]);
  assertEq(evaled.mock.calls.length, 1); // ...it's called only once

  unsub();
});

test("[prop] whatever value you initialize it with is what comes out", () => {
  fc.assert(
    fc.property(
      anyObject,

      (value) => {
        const signal = new MutableSignal(value);
        assertSame(signal.get(), value);
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
        assertSame(signal.get(), init);

        signal.mutate((x) => {
          // @ts-expect-error deliberately mutate
          x.whatever = newVal;
        });
        assertSame(signal.get(), init);

        // But the mutation happened
        assertSame(
          // @ts-expect-error deliberately access
          signal.get().whatever,
          newVal
        );
      }
    )
  );
});
