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
  const jokes$ = new Signal(["joke1", "joke2"]);
  const allGreat$ = new Signal(false);
  const multiplier$ = new Signal(1); // Number of laughs per joke

  const laughs$ = DerivedSignal.from(jokes$, multiplier$, (jokes, multiplier) =>
    jokes.flatMap(() => Array.from({ length: multiplier }, () => "ha"))
  );

  const greatLaughs$ = DerivedSignal.from(
    laughs$,
    allGreat$,
    (laughs, allGreat) =>
      allGreat ? laughs.map((laugh) => laugh.toUpperCase()) : laughs
  );

  expect(laughs$.get()).toEqual(["ha", "ha"]);
  multiplier$.set(1);
  expect(greatLaughs$.get()).toEqual(["ha", "ha"]);
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
  counter.name = "counter";
  const isEven = DerivedSignal.from(counter, (n) => (n & 1) === 0);
  isEven.name = "isEven";
  const parity = DerivedSignal.from(isEven, (even) => (even ? "even" : "odd"));
  parity.name = "parity";

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
