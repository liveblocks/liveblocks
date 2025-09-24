import fc from "fast-check";
import { assertEq, assertSame, assertThrows } from "tosti";
import { expect, test, vi } from "vitest";

import { shallow } from "../../../lib/shallow";
import { batch, Signal } from "../../signals";

test("empty", () => {
  assertEq(new Signal({}).get(), {});
  assertEq(new Signal([1, 2, 3]).get(), [1, 2, 3]);
  assertSame(new Signal(123).get(), 123);
  assertSame(new Signal(undefined).get(), undefined);
  assertSame(new Signal(null).get(), null);
});

test("with custom equals function", () => {
  const x = [1, 2, 3];
  const y = [1, 2, 3]; // Same values, but different reference

  {
    const signal = new Signal(x);
    assertSame(signal.get(), x);
    signal.set(y);
    assertSame(signal.get(), y);
  }

  {
    const signal = new Signal(x, shallow);
    //                           ^^^^^^^
    assertSame(signal.get(), x);
    signal.set(y);
    assertSame(signal.get(), x);
    //                        ^ Not y!
  }
});

test("signals only notify watchers when their value changes", () => {
  const fn = vi.fn();

  const counter = new Signal(0);

  const unsub = counter.subscribe(fn);
  assertEq(fn.mock.calls, []);

  assertEq(counter.get(), 0);
  assertEq(fn.mock.calls, []);

  counter.set(0);
  counter.get();
  assertEq(fn.mock.calls, []);

  counter.set((n) => n + 1);

  unsub();
});

test("without batching three signal updates will lead to three notifications", () => {
  const fn = vi.fn();
  const x = new Signal(1);

  const unsub = x.subscribe(fn);
  assertEq(fn.mock.calls, []);

  assertEq(x.get(), 1);

  x.set(2);
  x.set(3);
  x.set(7);

  assertEq(x.get(), 7);

  assertEq(fn.mock.calls.length, 3);
  unsub();
});

test("batched signal updates notify only once", () => {
  const fn = vi.fn();
  const x = new Signal(1);

  const unsub = x.subscribe(fn);
  assertEq(fn.mock.calls, []);

  assertEq(x.get(), 1);

  batch(() => {
    x.set(2);
    x.set(3);
    x.set(7);
  });

  assertEq(x.get(), 7);

  assertEq(fn.mock.calls.length, 1); // Not 3 (!)
  unsub();
});

test("[prop] whatever value you initialize it with is what comes out", () => {
  fc.assert(
    fc.property(
      fc.anything(),

      (value) => {
        const signal = new Signal(value);
        assertSame(signal.get(), value);
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
        assertSame(signal.get(), init);

        signal.set(newVal);
        assertSame(signal.get(), newVal);
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
        assertSame(signal.get(), init);

        /* eslint-disable @typescript-eslint/no-unsafe-return */
        assertThrows(() => {
          // @ts-expect-error - deliberately set invalid prop
          signal.get().abc = 123;
        }, /Cannot/); // XXX This used to test for TypeError, add capability to do that to assertThrows too

        // @ts-expect-error - get prop
        assertSame(signal.get().abc, undefined);

        // Freezes in setter
        signal.set(newVal);

        assertThrows(() => {
          // @ts-expect-error - deliberately set invalid prop
          signal.get().xyz = 456;
        }, /Cannot/); // XXX This used to test for TypeError, add capability to do that to assertThrows too

        // @ts-expect-error - get prop
        assertSame(signal.get().xyz, undefined);
        /* eslint-enable @typescript-eslint/no-unsafe-return */
      }
    )
  );
});
