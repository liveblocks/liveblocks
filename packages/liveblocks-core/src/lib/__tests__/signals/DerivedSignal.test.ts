import { expect, test, vi } from "vitest";

import { shallow } from "../../../lib/shallow";
import { batch, DerivedSignal, Signal } from "../../../lib/signals";
import { DefaultMap } from "../../DefaultMap";

test("compute signal from other signals", () => {
  const greeting = new Signal("hi");
  const count = new Signal(3);
  const derived = DerivedSignal.from(
    greeting,
    count,
    (x, y) => `${x.repeat(y)}!`
  );

  expect(derived.get()).toEqual("hihihi!");
  expect(derived.get()).toEqual("hihihi!");
  expect(derived.isDirty).toEqual(false);
  count.set(5);
  expect(derived.isDirty).toEqual(true);
  expect(derived.get()).toEqual("hihihihihi!");

  greeting.set("ha");
  expect(derived.get()).toEqual("hahahahaha!");

  count.set(0);
  expect(derived.get()).toEqual("!");
});

test("compute signal from many other signals", () => {
  const jokesSignal = new Signal(["joke1", "joke2"]);
  const allGreatSignal = new Signal(false);
  const multiplierSignal = new Signal(1); // Number of laughs per joke

  const laughsSignal = DerivedSignal.from(
    jokesSignal,
    multiplierSignal,
    (jokes, multiplier) =>
      jokes.flatMap(() => Array.from({ length: multiplier }, () => "ha"))
  );

  const greatLaughsSignal = DerivedSignal.from(
    laughsSignal,
    allGreatSignal,
    (laughs, allGreat) =>
      allGreat ? laughs.map((laugh) => laugh.toUpperCase()) : laughs
  );

  expect(laughsSignal.get()).toEqual(["ha", "ha"]);
  multiplierSignal.set(3);
  expect(greatLaughsSignal.get()).toEqual(["ha", "ha", "ha", "ha", "ha", "ha"]);
  allGreatSignal.set(true);
  expect(greatLaughsSignal.get()).toEqual(["HA", "HA", "HA", "HA", "HA", "HA"]);
});

test("derived signal chaining", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  expect(parity.isDirty).toEqual(true);
  expect(parity.get()).toEqual("even");
  expect(parity.isDirty).toEqual(false);

  counter.set((n) => n + 1);

  expect(parity.isDirty).toEqual(true);
  expect(parity.get()).toEqual("odd");
  expect(parity.isDirty).toEqual(false);

  counter.set((n) => n + 1);
  counter.set((n) => n + 1);

  expect(parity.isDirty).toEqual(true);
  expect(parity.get()).toEqual("odd");
  expect(parity.isDirty).toEqual(false);
});

test("derived signals re-evaluate when sources change (without listeners)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  expect(parity.get()).toEqual("even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  expect(parity.get()).toEqual("odd");
});

test("derived signals re-evaluate when sources change (with listeners)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = parity.subscribe(() => {});

  expect(parity.get()).toEqual("even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  expect(parity.get()).toEqual("even");

  // Setting to another even value also does not trigger
  counter.set(37642);
  expect(parity.get()).toEqual("even");

  // Setting to an odd value however does trigger
  counter.set(13);
  expect(parity.get()).toEqual("odd");

  unsub();
});

test("derived signals re-evaluate when sources change (with listeners in parent)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = isEven.subscribe(() => {});

  expect(parity.get()).toEqual("even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  expect(parity.get()).toEqual("odd");

  unsub();
});

test("derived signals re-evaluate when sources change (with listeners in grandparent)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = counter.subscribe(() => {});

  expect(parity.get()).toEqual("even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  expect(parity.get()).toEqual("odd");

  unsub();
});

test("signals only notify watchers when their value changes", () => {
  const fn = vi.fn();

  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = parity.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  expect(parity.get()).toEqual("even");
  expect(fn).not.toHaveBeenCalled();

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();
  expect(fn).not.toHaveBeenCalled();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();
  expect(fn).not.toHaveBeenCalled();

  // Setting to an odd value however does trigger
  counter.set(13);
  expect(parity.get()).toEqual("odd");
  expect(fn).toHaveBeenCalledTimes(1);

  unsub();
});

test("signals only notify watchers when their value changes (with shallow)", () => {
  let numEvals = 0;

  const fn = vi.fn();

  const fruits = new Signal<string[]>([]);
  const uppercase = new Signal(false);
  const result = DerivedSignal.from(
    fruits,
    uppercase,

    (fruits, upper) => fruits.map((f) => (upper ? f.toUpperCase() : f)),
    shallow
  );
  const renderCounter = DerivedSignal.from(result, (_) => ++numEvals);

  const unsub = renderCounter.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  const value1 = result.get();
  const value2 = result.get();
  expect(value1).toBe(value2);

  expect(fn).not.toHaveBeenCalled();

  uppercase.set(true);
  const value3 = result.get();
  expect(value3).toEqual([]); // Still empty, but should not have a new value
  expect(value1).toBe(value3);
  expect(fn).not.toHaveBeenCalled();

  expect(numEvals).toEqual(1);

  // Toggling uppercase has no effect when the list is still empty
  uppercase.set(false);
  uppercase.set(true);
  expect(numEvals).toEqual(1);

  // Toggling uppercase has no effect
  fruits.set(["apple", "banana"]);
  expect(numEvals).toEqual(2);
  uppercase.set(true); // Was already true, so has no effect
  expect(numEvals).toEqual(2);
  uppercase.set(false);
  expect(numEvals).toEqual(3);

  unsub();
});

test("batch signal updates so derived signals will only be notified once", () => {
  const fn1 = vi.fn(); // Callback when z changes
  const fn2 = vi.fn(); // Callback when zz changes

  const x = new Signal(1);
  const y = new Signal(2);
  const z = DerivedSignal.from(x, y, (x, y) => x * y);
  const zz = DerivedSignal.from(x, z, (x, z) => x - z * 10);

  const unsub1 = z.subscribe(fn1);
  const unsub2 = zz.subscribe(fn2);
  expect(fn1).not.toHaveBeenCalled();

  expect(z.get()).toEqual(2);
  expect(zz.get()).toEqual(-19);

  batch(() => {
    x.set(7);
    y.set(3);
  });

  expect(z.get()).toEqual(21);
  expect(zz.get()).toEqual(-203);

  expect(fn1).toHaveBeenCalledTimes(1); // Not 2 (!)
  expect(fn2).toHaveBeenCalledTimes(1); // Not 3 (!)

  unsub1();
  unsub2();
});

test("batch signal notifications and re-evaluations are as efficient as possible", () => {
  const x = new Signal(1);
  const y = new Signal(2);
  const z = new Signal(3);
  const abc = DerivedSignal.from(x, y, z, (x, y, z) => [x, y, z], shallow);
  const sorted = DerivedSignal.from(abc, (abc) => abc.sort(), shallow);

  expect(sorted.isDirty).toEqual(true);
  expect(sorted.get()).toEqual([1, 2, 3]);
  expect(sorted.isDirty).toEqual(false);

  batch(() => {
    x.set(7);
    y.set(3);
    z.set(0);
  });

  expect(sorted.isDirty).toEqual(true);
  expect(sorted.get()).toEqual([0, 3, 7]);
  expect(sorted.isDirty).toEqual(false);

  const before = sorted.get();
  batch(() => {
    x.set(7);
    y.set(3);
    z.set(0);
  });

  // Value did not change, so reference did not change either
  const after = sorted.get();
  expect(after).toBe(before);

  batch(() => {
    // Same values, but in different signals
    x.set(3);
    y.set(0);
    z.set(7);
  });

  // Derived value still did not change, since sorted result is the same
  const after2 = sorted.get();
  expect(after2).toBe(before);

  const fn = vi.fn(); // Callback when sorted changes
  const unsub = sorted.subscribe(fn);
  expect(fn).not.toHaveBeenCalled();

  batch(() => {
    x.set(0);
    y.set(3);
    z.set(7);
  });

  // Also, it does not notify watchers
  expect(fn).not.toHaveBeenCalled();

  batch(() => {
    x.set(0);
    x.set(0);
    x.set(1);
    y.set(2);
    z.set(3);
  });

  // However, if we make an actual change, it will
  expect(fn).toHaveBeenCalledTimes(1);
  expect(sorted.get()).toEqual([1, 2, 3]);

  unsub();
});

test("conditionally read from other signal", () => {
  const index = new Signal(0); // Signal to read
  const signals = [
    new Signal("hi"),
    new Signal("foo"),
    new Signal("bar"),
    new Signal("qux"),
  ];

  const derived = DerivedSignal.from(index, (idx) => signals[idx].get());

  expect(derived.isDirty).toEqual(true);
  expect(derived.get()).toEqual("hi");
  expect(derived.get()).toEqual("hi");
  expect(derived.isDirty).toEqual(false);

  signals[2].set("lol"); // 'bar' -> 'lol'

  // Isn't dirty, because derived did not depend on this value
  expect(derived.isDirty).toEqual(false);

  expect(derived.get()).toEqual("hi");

  index.set(1); // Change to depend on different signal

  expect(derived.get()).toEqual("foo");
  expect(derived.isDirty).toEqual(false);

  signals[1].set("baz"); // 'foo' -> 'baz'

  // Now it _is_ dirty, because it depends on this signal now
  expect(derived.isDirty).toEqual(true);
  expect(derived.get()).toEqual("baz");
  expect(derived.isDirty).toEqual(false);
});

test("conditionally read nested signals", () => {
  const fn = vi.fn();
  const map = new DefaultMap<number, Signal<number>>(() => new Signal(0));

  map.getOrCreate(0).set(7);
  map.getOrCreate(1).set(3);
  map.getOrCreate(2).set(1);
  map.getOrCreate(3).set(8);
  map.getOrCreate(4).set(42);

  const start = new Signal(0); // Signal to read

  const derived = DerivedSignal.from(() => {
    fn();
    let idx = start.get();
    while (map.has(idx)) {
      idx = map.get(idx)!.get();
    }
    return idx;
  });

  expect(derived.get()).toEqual(7); // 0 -> 7

  start.set(11);
  expect(derived.get()).toEqual(11); // 11

  start.set(2);
  expect(derived.get()).toEqual(8); // 2 -> 1 -> 3 -> 8

  map.getOrCreate(1).set(7);
  map.getOrCreate(7).set(9);
  map.getOrCreate(9).set(999);
  expect(derived.get()).toEqual(999); // 2 -> 1 -> 7 -> 9 -> 999

  start.set(1);
  expect(derived.get()).toEqual(999); // 1 -> 7 -> 9 -> 999

  fn.mockClear();
  expect(fn).toHaveBeenCalledTimes(0);

  map.clear(); // No signal is explicitly invalidated, so it won't re-evaluate
  start.set(1); // Setting start to same value also does not re-evaluate
  expect(derived.get()).toEqual(999);

  expect(fn).toHaveBeenCalledTimes(0);

  // However, triggering an update resets it
  start.set(0);
  expect(derived.get()).toEqual(0);
  expect(fn).toHaveBeenCalledTimes(1);

  start.set(1234);
  expect(derived.get()).toEqual(1234);
});

test("conditionally reading signals won't unregister old sinks (when using static syntax)", () => {
  const notificationFn = vi.fn();
  const evalFn = vi.fn();
  const cond = new Signal(false);
  const x = new Signal(7);
  const y = new Signal(42);
  const z = DerivedSignal.from(cond, x, y, (cond, x, y) => {
    evalFn();
    return cond ? x : y;
  });

  expect(evalFn).toHaveBeenCalledTimes(0);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  const unsub = z.subscribe(notificationFn);
  expect(evalFn).toHaveBeenCalledTimes(1);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  expect(z.get()).toEqual(42);
  expect(evalFn).toHaveBeenCalledTimes(1);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  cond.set(true);
  expect(evalFn).toHaveBeenCalledTimes(2);
  expect(notificationFn).toHaveBeenCalledTimes(1);

  y.set(43);
  expect(evalFn).toHaveBeenCalledTimes(3); // Re-evaluation, because static!
  expect(notificationFn).toHaveBeenCalledTimes(1); // However, since the value did not change, no notification

  x.set(99);
  expect(evalFn).toHaveBeenCalledTimes(4);
  expect(notificationFn).toHaveBeenCalledTimes(2);

  unsub();
});

test("conditionally reading signals will unregister old sinks (when using dynamic syntax)", () => {
  const notificationFn = vi.fn();
  const evalFn = vi.fn();
  const cond = new Signal(false);
  const x = new Signal(7);
  const y = new Signal(42);
  const z = DerivedSignal.from(() => {
    evalFn();
    return cond.get() ? x.get() : y.get();
  });

  expect(evalFn).toHaveBeenCalledTimes(0);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  const unsub = z.subscribe(notificationFn);

  expect(evalFn).toHaveBeenCalledTimes(1);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  expect(z.get()).toEqual(42);
  expect(evalFn).toHaveBeenCalledTimes(1);
  expect(notificationFn).toHaveBeenCalledTimes(0);

  cond.set(true);
  expect(evalFn).toHaveBeenCalledTimes(2);
  expect(notificationFn).toHaveBeenCalledTimes(1);

  y.set(43);
  expect(evalFn).toHaveBeenCalledTimes(2); // No re-evaluation, because we're no longer a sink of y!
  expect(notificationFn).toHaveBeenCalledTimes(1);

  x.set(99);
  expect(evalFn).toHaveBeenCalledTimes(3);
  expect(notificationFn).toHaveBeenCalledTimes(2);

  unsub();
});

test("conditionally read from nested signals", () => {
  const map = new DefaultMap<string, Signal<number>>(() => new Signal(0));
  const prefix = new Signal("pre");
  const fn = vi.fn();

  const derived = DerivedSignal.from(
    prefix,
    (prefix) => {
      fn();
      const arr = [];
      for (const [key, signal] of map.entries()) {
        if (key.startsWith(prefix)) {
          arr.push(signal.get());
        }
      }
      return arr;
    },
    shallow
  );

  // Populate map with lots of signals
  for (let i = 0; i < 10_000; i++) {
    map.getOrCreate("pre" + i);
  }

  expect(derived.get().length).toEqual(10_000);
  expect(fn).toHaveBeenCalledTimes(1);
  prefix.set("pre444");

  expect(derived.get().toString()).toEqual("0,0,0,0,0,0,0,0,0,0,0");

  expect(fn).toHaveBeenCalledTimes(2);

  // Changing unrelated signals does not trigger re-evaluation
  map.getOrCreate("pre1234").set(927);
  map.getOrCreate("pre7623").set(28179);
  map.getOrCreate("foobar123").set(238);
  expect(fn).toHaveBeenCalledTimes(2);

  expect(derived.get().toString()).toEqual("0,0,0,0,0,0,0,0,0,0,0");
  expect(fn).toHaveBeenCalledTimes(2);

  // But changing related signals *does* trigger re-evaluation
  map.getOrCreate("pre4440").set(908);
  map.getOrCreate("pre4441").set(1313);
  map.getOrCreate("pre444").set(43);
  expect(fn).toHaveBeenCalledTimes(2);

  expect(derived.get().toString()).toEqual("43,908,1313,0,0,0,0,0,0,0,0");
  expect(fn).toHaveBeenCalledTimes(3);

  // Deletion is tricky though! It's not an explicit value change, just
  // a reference removal, so this won't be detectable.
  map.delete("pre4441");
  map.getOrCreate("another");
  expect(fn).toHaveBeenCalledTimes(3);

  expect(derived.get().toString()).toEqual("43,908,1313,0,0,0,0,0,0,0,0");
  expect(fn).toHaveBeenCalledTimes(3);

  // In order to detect the deletion, any of the other signals must change to trigger re-evaluation
  map.getOrCreate("pre4447").set(18);
  expect(derived.get().toString()).toEqual("43,908,0,0,0,0,0,18,0,0");
  expect(fn).toHaveBeenCalledTimes(4);
});
