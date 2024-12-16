import { shallow } from "../../lib/shallow";
import { DerivedSignal, Signal } from "../Signal";

it("compute signal from other signals", () => {
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

it("compute signal from many other signals", () => {
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

it("derived signal chaining", () => {
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

it("derived signals re-evaluate when sources change (without listeners)", () => {
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

it("derived signals re-evaluate when sources change (with listeners)", () => {
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

it("derived signals re-evaluate when sources change (with listeners in parent)", () => {
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

it("derived signals re-evaluate when sources change (with listeners in grandparent)", () => {
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

it("signals only notify watchers when their value changes", () => {
  const fn = jest.fn();

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

it("signals only notify watchers when their value changes (with shallow)", () => {
  let numEvals = 0;

  const fn = jest.fn();

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

  expect(numEvals).toEqual(0);

  // Toggling uppercase has no effect when the list is still empty
  uppercase.set(false);
  uppercase.set(true);
  expect(numEvals).toEqual(0);

  // Toggling uppercase has no effect
  fruits.set(["apple", "banana"]);
  expect(numEvals).toEqual(1);
  uppercase.set(true); // Was already true, so has no effect
  expect(numEvals).toEqual(1);
  uppercase.set(false);
  expect(numEvals).toEqual(2);

  unsub();
});

it.failing(
  "batch signal updates so derived signals will only be notified once",
  () => {
    function batch(callback: () => void) {
      // TODO Implement this
      callback();
    }

    const fn = jest.fn();

    const x = new Signal(1);
    const y = new Signal(2);
    const z = DerivedSignal.from(x, y, (x, y) => x * y);

    const unsub = z.subscribe(fn);
    expect(fn).not.toHaveBeenCalled();

    expect(z.get()).toEqual(2);

    batch(() => {
      x.set(7);
      y.set(3);
    });

    expect(z.get()).toEqual(21);

    //
    // NOTE: The following assertion currently fails without batching support
    // Currently this will get 2 updates! First 14, then 21.
    //
    // The purpose of batching should be twofold:
    // - Delay notification of z until the end of the batch
    // - Only invoke the z computation once, even if multiple signals have changed
    //
    expect(fn).toHaveBeenCalledTimes(1);

    unsub();
  }
);
