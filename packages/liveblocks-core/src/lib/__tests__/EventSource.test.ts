import fc from "fast-check";
import { assertEq, assertSame } from "tosti";
import { describe, test, vi } from "vitest";

import { makeBufferableEventSource, makeEventSource } from "../EventSource";

const anything = () =>
  fc.anything({
    withBigInt: true,
    withBoxedValues: true,
    withDate: true,
    withMap: true,
    withNullPrototype: true,
    withObjectString: true,
    withSet: true,
    withTypedArray: true,
    withSparseArray: true,
  });

describe("EventSource", () => {
  test("normal usage", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = vi.fn();
          const hub = makeEventSource();

          hub.observable.subscribe(callback);
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback.mock.calls.length, 3);
          for (const [arg] of callback.mock.calls) {
            assertSame(arg, payload);
          }
        }
      )
    );
  });

  test("registering multiple callbacks", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback1 = vi.fn();
          const callback2 = vi.fn();
          const hub = makeEventSource();

          hub.observable.subscribe(callback1);
          hub.notify(payload);

          hub.observable.subscribe(callback2);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback1.mock.calls.length, 3);
          for (const [arg] of callback1.mock.calls) {
            assertSame(arg, payload);
          }

          assertEq(callback2.mock.calls.length, 2);
          for (const [arg] of callback2.mock.calls) {
            assertSame(arg, payload);
          }
        }
      )
    );
  });

  test("getting counts", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const callback3 = vi.fn();
    const hub = makeEventSource();

    // No callbacks registered yet
    assertSame(hub.count(), 0);

    const unsub1 = hub.observable.subscribe(callback1);
    assertSame(hub.count(), 1);

    const unsub2a = hub.observable.subscribe(callback2);
    assertSame(hub.count(), 2);

    // Registering the same exact callback multiple times has no effect
    // on the count
    const unsub2b = hub.observable.subscribe(callback2);
    assertSame(hub.count(), 2);

    const unsub3 = hub.observable.subscribeOnce(callback3);
    assertSame(hub.count(), 3);

    unsub1();
    unsub2a();
    unsub2b();
    assertSame(hub.count(), 1);

    unsub3();
    assertSame(hub.count(), 0);

    // Calling unsub more often will not have an effect
    unsub1();
    unsub2a();
    unsub2b();
    unsub3();
    assertSame(hub.count(), 0);
  });

  test("detecting if notifications were sent", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const hub = makeEventSource();

    assertSame(hub.notify("hi"), false); // No callbacks were invoked

    const unsub1 = hub.observable.subscribe(callback1);
    const unsub2 = hub.observable.subscribe(callback2);

    assertSame(hub.notify("hi"), true); // At least one callback was invoked

    unsub1();
    assertSame(hub.notify("hi"), true);

    unsub2();
    assertSame(hub.notify("hi"), false);
  });

  test("subscribing once", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = vi.fn();
          const hub = makeEventSource();

          const dereg1 = hub.observable.subscribeOnce(callback);
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback.mock.calls.length, 1); // Called only once, not three times
          for (const [arg] of callback.mock.calls) {
            assertSame(arg, payload);
          }

          // Deregistering has no effect
          dereg1();
          hub.notify(payload);
          assertEq(callback.mock.calls.length, 1); // Called only once, not three times
        }
      )
    );
  });

  test("deregisering usage", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback1 = vi.fn();
          const callback2 = vi.fn();
          const hub = makeEventSource();

          const dereg1 = hub.observable.subscribe(callback1);

          // Registering the same function instance multiple times has no
          // observable effect
          const dereg2a = hub.observable.subscribe(callback2);
          const dereg2b = hub.observable.subscribe(callback2);

          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback1.mock.calls.length, 2); // Both get updates
          assertEq(callback2.mock.calls.length, 2);

          // Deregister callback1
          dereg1();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback1.mock.calls.length, 2); // Callback1 stopped getting updates
          assertEq(callback2.mock.calls.length, 5); // Callback2 still receives updates

          // Deregister callback2
          dereg2a();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback1.mock.calls.length, 2); // Callback1 already stopped getting updates before
          assertEq(callback2.mock.calls.length, 5); // Callback2 now also stopped getting them

          // Deregister callback2 again (has no effect)
          dereg2b();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback1.mock.calls.length, 2); // Callback1 already stopped getting updates before
          assertEq(callback2.mock.calls.length, 5); // Callback2 already stopped getting updates before
        }
      )
    );
  });

  test("awaiting events", async () => {
    const src = makeEventSource();
    const promise$ = src.waitUntil();

    // Now notify, so the promise will resolve
    src.notify(0);
    src.notify(1);
    src.notify(2);

    await assertEq(promise$, 0);
  });

  test("awaiting events conditionally", async () => {
    const src = makeEventSource<number>();
    const promise$ = src.waitUntil((n) => n % 2 === 1);

    // Now notify, so the promise will resolve
    src.notify(2);
    src.notify(4);
    src.notify(6);
    src.notify(7); // First odd number, so we'll wait until this one!
    src.notify(8);

    await assertEq(promise$, 7);
  });
});

describe("BufferableEventSource", () => {
  test("detecting if notifications were sent", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const src = makeBufferableEventSource();

    assertSame(src.notify("hi"), false); // No callbacks were invoked

    const unsub1 = src.observable.subscribe(callback1);
    const unsub2 = src.observable.subscribe(callback2);

    assertSame(src.notify("hi"), true); // At least one callback was invoked

    unsub1();
    assertSame(src.notify("hi"), true);

    // Start buffering
    src.pause();
    assertSame(src.notify("hi"), false);
    assertSame(src.notify("hi"), false);
    src.unpause();
    assertSame(src.notify("hi"), true);

    unsub2();
    assertSame(src.notify("hi"), false);
  });

  test("pausing/continuing event delivery", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = vi.fn();
          const hub = makeBufferableEventSource();

          const unsub = hub.observable.subscribe(callback);

          hub.pause();
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          assertEq(callback.mock.calls.length, 0); // No events get delivered until unpaused

          hub.unpause();
          assertEq(callback.mock.calls.length, 3); // Buffered events get delivered

          // Deregister callback
          unsub();
        }
      )
    );
  });
});
