import fc from "fast-check";

import { DerivedSignal, MutableSignal } from "../Signal";

test("empty", () => {
  expect(new MutableSignal({}).get()).toStrictEqual({});
  expect(new MutableSignal([1, 2, 3]).get()).toStrictEqual([1, 2, 3]);
  expect(new MutableSignal(123).get()).toBe(123);
  expect(new MutableSignal(undefined).get()).toBe(undefined);
  expect(new MutableSignal(null).get()).toBe(null);
});

it("signals always notify watchers whenever mutated (because we cannot tell if their value has changed)", () => {
  const fn = jest.fn();

  const counter = new MutableSignal(0);

  const unsub = counter.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(counter.get()).toEqual(0);
  expect(fn).not.toHaveBeenCalled();

  counter.mutate(() => 0);
  expect(counter.get()).toEqual(0);
  expect(fn).not.toHaveBeenCalled();

  counter.mutate((n) => n + 1);
  expect(counter.get()).toEqual(1);

  unsub();
});

it("when chained, derived signals will think the value changed", () => {
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

  fruits.mutate((arr) => arr.sort());

  expect(count.get()).toEqual(3);
  expect(str.get()).toEqual("apple,banana,cherry");
});

test("[prop] whatever value you initialize it with is what comes out", () => {
  fc.assert(
    fc.property(
      fc.anything(),

      (value) => {
        const signal = new MutableSignal(value);
        expect(signal.get()).toBe(value);
      }
    )
  );
});

// XXX Make pass!
test.failing("[prop] mutating works with any value", () => {
  fc.assert(
    fc.property(
      fc.anything(),
      fc.anything(),

      (init, newVal) => {
        const signal = new MutableSignal(init);
        expect(signal.get()).toBe(init);

        signal.mutate(() => newVal);
        expect(signal.get()).toBe(newVal);
      }
    )
  );
});
