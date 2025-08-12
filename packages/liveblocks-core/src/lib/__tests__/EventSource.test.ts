import fc from "fast-check";
import { describe, expect, test, vi } from "vitest";

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

          expect(callback).toHaveBeenCalledTimes(3);
          for (const [arg] of callback.mock.calls) {
            expect(arg).toBe(payload);
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

          expect(callback1).toHaveBeenCalledTimes(3);
          for (const [arg] of callback1.mock.calls) {
            expect(arg).toBe(payload);
          }

          expect(callback2).toHaveBeenCalledTimes(2);
          for (const [arg] of callback2.mock.calls) {
            expect(arg).toBe(payload);
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
    expect(hub.count()).toBe(0);

    const unsub1 = hub.observable.subscribe(callback1);
    expect(hub.count()).toBe(1);

    const unsub2a = hub.observable.subscribe(callback2);
    expect(hub.count()).toBe(2);

    // Registering the same exact callback multiple times has no effect
    // on the count
    const unsub2b = hub.observable.subscribe(callback2);
    expect(hub.count()).toBe(2);

    const unsub3 = hub.observable.subscribeOnce(callback3);
    expect(hub.count()).toBe(3);

    unsub1();
    unsub2a();
    unsub2b();
    expect(hub.count()).toBe(1);

    unsub3();
    expect(hub.count()).toBe(0);

    // Calling unsub more often will not have an effect
    unsub1();
    unsub2a();
    unsub2b();
    unsub3();
    expect(hub.count()).toBe(0);
  });

  test("detecting if notifications were sent", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const hub = makeEventSource();

    expect(hub.notify("hi")).toBe(false); // No callbacks were invoked

    const unsub1 = hub.observable.subscribe(callback1);
    const unsub2 = hub.observable.subscribe(callback2);

    expect(hub.notify("hi")).toBe(true); // At least one callback was invoked

    unsub1();
    expect(hub.notify("hi")).toBe(true);

    unsub2();
    expect(hub.notify("hi")).toBe(false);
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

          expect(callback).toHaveBeenCalledTimes(1); // Called only once, not three times
          for (const [arg] of callback.mock.calls) {
            expect(arg).toBe(payload);
          }

          // Deregistering has no effect
          dereg1();
          hub.notify(payload);
          expect(callback).toHaveBeenCalledTimes(1); // Called only once, not three times
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

          expect(callback1).toHaveBeenCalledTimes(2); // Both get updates
          expect(callback2).toHaveBeenCalledTimes(2);

          // Deregister callback1
          dereg1();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1).toHaveBeenCalledTimes(2); // Callback1 stopped getting updates
          expect(callback2).toHaveBeenCalledTimes(5); // Callback2 still receives updates

          // Deregister callback2
          dereg2a();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1).toHaveBeenCalledTimes(2); // Callback1 already stopped getting updates before
          expect(callback2).toHaveBeenCalledTimes(5); // Callback2 now also stopped getting them

          // Deregister callback2 again (has no effect)
          dereg2b();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1).toHaveBeenCalledTimes(2); // Callback1 already stopped getting updates before
          expect(callback2).toHaveBeenCalledTimes(5); // Callback2 already stopped getting updates before
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

    await expect(promise$).resolves.toBe(0);
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

    await expect(promise$).resolves.toBe(7);
  });
});

describe("BufferableEventSource", () => {
  test("detecting if notifications were sent", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const src = makeBufferableEventSource();

    expect(src.notify("hi")).toBe(false); // No callbacks were invoked

    const unsub1 = src.observable.subscribe(callback1);
    const unsub2 = src.observable.subscribe(callback2);

    expect(src.notify("hi")).toBe(true); // At least one callback was invoked

    unsub1();
    expect(src.notify("hi")).toBe(true);

    // Start buffering
    src.pause();
    expect(src.notify("hi")).toBe(false);
    expect(src.notify("hi")).toBe(false);
    src.unpause();
    expect(src.notify("hi")).toBe(true);

    unsub2();
    expect(src.notify("hi")).toBe(false);
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

          expect(callback).not.toHaveBeenCalled(); // No events get delivered until unpaused

          hub.unpause();
          expect(callback).toHaveBeenCalledTimes(3); // Buffered events get delivered

          // Deregister callback
          unsub();
        }
      )
    );
  });
});
