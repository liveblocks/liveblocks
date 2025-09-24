import { assertEq, assertSame } from "tosti";
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

  assertEq(derived.get(), "hihihi!");
  assertEq(derived.get(), "hihihi!");
  assertEq(derived.isDirty, false);
  count.set(5);
  assertEq(derived.isDirty, true);
  assertEq(derived.get(), "hihihihihi!");

  greeting.set("ha");
  assertEq(derived.get(), "hahahahaha!");

  count.set(0);
  assertEq(derived.get(), "!");
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

  assertEq(laughsSignal.get(), ["ha", "ha"]);
  multiplierSignal.set(3);
  assertEq(greatLaughsSignal.get(), ["ha", "ha", "ha", "ha", "ha", "ha"]);
  allGreatSignal.set(true);
  assertEq(greatLaughsSignal.get(), ["HA", "HA", "HA", "HA", "HA", "HA"]);
});

test("derived signal chaining", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  assertEq(parity.isDirty, true);
  assertEq(parity.get(), "even");
  assertEq(parity.isDirty, false);

  counter.set((n) => n + 1);

  assertEq(parity.isDirty, true);
  assertEq(parity.get(), "odd");
  assertEq(parity.isDirty, false);

  counter.set((n) => n + 1);
  counter.set((n) => n + 1);

  assertEq(parity.isDirty, true);
  assertEq(parity.get(), "odd");
  assertEq(parity.isDirty, false);
});

test("derived signals re-evaluate when sources change (without listeners)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  assertEq(parity.get(), "even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  assertEq(parity.get(), "odd");
});

test("derived signals re-evaluate when sources change (with listeners)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = parity.subscribe(() => {});

  assertEq(parity.get(), "even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  assertEq(parity.get(), "even");

  // Setting to another even value also does not trigger
  counter.set(37642);
  assertEq(parity.get(), "even");

  // Setting to an odd value however does trigger
  counter.set(13);
  assertEq(parity.get(), "odd");

  unsub();
});

test("derived signals re-evaluate when sources change (with listeners in parent)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = isEven.subscribe(() => {});

  assertEq(parity.get(), "even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  assertEq(parity.get(), "odd");

  unsub();
});

test("derived signals re-evaluate when sources change (with listeners in grandparent)", () => {
  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = counter.subscribe(() => {});

  assertEq(parity.get(), "even");

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();

  // Setting to an odd value however does trigger
  counter.set(13);
  assertEq(parity.get(), "odd");

  unsub();
});

test("signals only notify watchers when their value changes", () => {
  const fn = vi.fn();

  const counter = new Signal(0);
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));

  const unsub = parity.subscribe(fn);
  assertEq(fn.mock.calls, []);

  assertEq(parity.get(), "even");
  assertEq(fn.mock.calls, []);

  // Setting to the same value does not trigger notification on parity
  counter.set(0);
  parity.get();
  assertEq(fn.mock.calls, []);

  // Setting to another even value also does not trigger
  counter.set(37642);
  parity.get();
  assertEq(fn.mock.calls, []);

  // Setting to an odd value however does trigger
  counter.set(13);
  assertEq(parity.get(), "odd");
  assertEq(fn.mock.calls.length, 1);

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
  assertEq(fn.mock.calls, []);

  const value1 = result.get();
  const value2 = result.get();
  assertSame(value1, value2);

  assertEq(fn.mock.calls, []);

  uppercase.set(true);
  const value3 = result.get();
  assertEq(value3, []); // Still empty, but should not have a new value
  assertSame(value1, value3);
  assertEq(fn.mock.calls, []);

  assertEq(numEvals, 1);

  // Toggling uppercase has no effect when the list is still empty
  uppercase.set(false);
  uppercase.set(true);
  assertEq(numEvals, 1);

  // Toggling uppercase has no effect
  fruits.set(["apple", "banana"]);
  assertEq(numEvals, 2);
  uppercase.set(true); // Was already true, so has no effect
  assertEq(numEvals, 2);
  uppercase.set(false);
  assertEq(numEvals, 3);

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
  assertEq(fn1.mock.calls, []);

  assertEq(z.get(), 2);
  assertEq(zz.get(), -19);

  batch(() => {
    x.set(7);
    y.set(3);
  });

  assertEq(z.get(), 21);
  assertEq(zz.get(), -203);

  assertEq(fn1.mock.calls.length, 1); // Not 2 (!)
  assertEq(fn2.mock.calls.length, 1); // Not 3 (!)

  unsub1();
  unsub2();
});

test("batch signal notifications and re-evaluations are as efficient as possible", () => {
  const x = new Signal(1);
  const y = new Signal(2);
  const z = new Signal(3);
  const abc = DerivedSignal.from(x, y, z, (x, y, z) => [x, y, z], shallow);
  const sorted = DerivedSignal.from(abc, (abc) => abc.sort(), shallow);

  assertEq(sorted.isDirty, true);
  assertEq(sorted.get(), [1, 2, 3]);
  assertEq(sorted.isDirty, false);

  batch(() => {
    x.set(7);
    y.set(3);
    z.set(0);
  });

  assertEq(sorted.isDirty, true);
  assertEq(sorted.get(), [0, 3, 7]);
  assertEq(sorted.isDirty, false);

  const before = sorted.get();
  batch(() => {
    x.set(7);
    y.set(3);
    z.set(0);
  });

  // Value did not change, so reference did not change either
  const after = sorted.get();
  assertSame(after, before);

  batch(() => {
    // Same values, but in different signals
    x.set(3);
    y.set(0);
    z.set(7);
  });

  // Derived value still did not change, since sorted result is the same
  const after2 = sorted.get();
  assertSame(after2, before);

  const fn = vi.fn(); // Callback when sorted changes
  const unsub = sorted.subscribe(fn);
  assertEq(fn.mock.calls, []);

  batch(() => {
    x.set(0);
    y.set(3);
    z.set(7);
  });

  // Also, it does not notify watchers
  assertEq(fn.mock.calls, []);

  batch(() => {
    x.set(0);
    x.set(0);
    x.set(1);
    y.set(2);
    z.set(3);
  });

  // However, if we make an actual change, it will
  assertEq(fn.mock.calls.length, 1);
  assertEq(sorted.get(), [1, 2, 3]);

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

  assertEq(derived.isDirty, true);
  assertEq(derived.get(), "hi");
  assertEq(derived.get(), "hi");
  assertEq(derived.isDirty, false);

  signals[2].set("lol"); // 'bar' -> 'lol'

  // Isn't dirty, because derived did not depend on this value
  assertEq(derived.isDirty, false);

  assertEq(derived.get(), "hi");

  index.set(1); // Change to depend on different signal

  assertEq(derived.get(), "foo");
  assertEq(derived.isDirty, false);

  signals[1].set("baz"); // 'foo' -> 'baz'

  // Now it _is_ dirty, because it depends on this signal now
  assertEq(derived.isDirty, true);
  assertEq(derived.get(), "baz");
  assertEq(derived.isDirty, false);
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

  assertEq(derived.get(), 7); // 0 -> 7

  start.set(11);
  assertEq(derived.get(), 11); // 11

  start.set(2);
  assertEq(derived.get(), 8); // 2 -> 1 -> 3 -> 8

  map.getOrCreate(1).set(7);
  map.getOrCreate(7).set(9);
  map.getOrCreate(9).set(999);
  assertEq(derived.get(), 999); // 2 -> 1 -> 7 -> 9 -> 999

  start.set(1);
  assertEq(derived.get(), 999); // 1 -> 7 -> 9 -> 999

  fn.mockClear();
  assertEq(fn.mock.calls.length, 0);

  map.clear(); // No signal is explicitly invalidated, so it won't re-evaluate
  start.set(1); // Setting start to same value also does not re-evaluate
  assertEq(derived.get(), 999);

  assertEq(fn.mock.calls.length, 0);

  // However, triggering an update resets it
  start.set(0);
  assertEq(derived.get(), 0);
  assertEq(fn.mock.calls.length, 1);

  start.set(1234);
  assertEq(derived.get(), 1234);
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

  assertEq(evalFn.mock.calls.length, 0);
  assertEq(notificationFn.mock.calls.length, 0);

  const unsub = z.subscribe(notificationFn);
  assertEq(evalFn.mock.calls.length, 1);
  assertEq(notificationFn.mock.calls.length, 0);

  assertEq(z.get(), 42);
  assertEq(evalFn.mock.calls.length, 1);
  assertEq(notificationFn.mock.calls.length, 0);

  cond.set(true);
  assertEq(evalFn.mock.calls.length, 2);
  assertEq(notificationFn.mock.calls.length, 1);

  y.set(43);
  assertEq(evalFn.mock.calls.length, 3); // Re-evaluation, because static!
  assertEq(notificationFn.mock.calls.length, 1); // However, since the value did not change, no notification

  x.set(99);
  assertEq(evalFn.mock.calls.length, 4);
  assertEq(notificationFn.mock.calls.length, 2);

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

  assertEq(evalFn.mock.calls.length, 0);
  assertEq(notificationFn.mock.calls.length, 0);

  const unsub = z.subscribe(notificationFn);

  assertEq(evalFn.mock.calls.length, 1);
  assertEq(notificationFn.mock.calls.length, 0);

  assertEq(z.get(), 42);
  assertEq(evalFn.mock.calls.length, 1);
  assertEq(notificationFn.mock.calls.length, 0);

  cond.set(true);
  assertEq(evalFn.mock.calls.length, 2);
  assertEq(notificationFn.mock.calls.length, 1);

  y.set(43);
  assertEq(evalFn.mock.calls.length, 2); // No re-evaluation, because we're no longer a sink of y!
  assertEq(notificationFn.mock.calls.length, 1);

  x.set(99);
  assertEq(evalFn.mock.calls.length, 3);
  assertEq(notificationFn.mock.calls.length, 2);

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

  assertEq(derived.get().length, 10_000);
  assertEq(fn.mock.calls.length, 1);
  prefix.set("pre444");

  assertEq(derived.get().toString(), "0,0,0,0,0,0,0,0,0,0,0");

  assertEq(fn.mock.calls.length, 2);

  // Changing unrelated signals does not trigger re-evaluation
  map.getOrCreate("pre1234").set(927);
  map.getOrCreate("pre7623").set(28179);
  map.getOrCreate("foobar123").set(238);
  assertEq(fn.mock.calls.length, 2);

  assertEq(derived.get().toString(), "0,0,0,0,0,0,0,0,0,0,0");
  assertEq(fn.mock.calls.length, 2);

  // But changing related signals *does* trigger re-evaluation
  map.getOrCreate("pre4440").set(908);
  map.getOrCreate("pre4441").set(1313);
  map.getOrCreate("pre444").set(43);
  assertEq(fn.mock.calls.length, 2);

  assertEq(derived.get().toString(), "43,908,1313,0,0,0,0,0,0,0,0");
  assertEq(fn.mock.calls.length, 3);

  // Deletion is tricky though! It's not an explicit value change, just
  // a reference removal, so this won't be detectable.
  map.delete("pre4441");
  map.getOrCreate("another");
  assertEq(fn.mock.calls.length, 3);

  assertEq(derived.get().toString(), "43,908,1313,0,0,0,0,0,0,0,0");
  assertEq(fn.mock.calls.length, 3);

  // In order to detect the deletion, any of the other signals must change to trigger re-evaluation
  map.getOrCreate("pre4447").set(18);
  assertEq(derived.get().toString(), "43,908,0,0,0,0,0,18,0,0");
  assertEq(fn.mock.calls.length, 4);
});
