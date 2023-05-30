import fc from "fast-check";

import { makeEventSource } from "../EventSource";

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
  it("normal usage", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = jest.fn();
          const hub = makeEventSource();

          hub.observable.subscribe(callback);
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback.mock.calls.length).toBe(3);
          for (const [arg] of callback.mock.calls) {
            expect(arg).toBe(payload);
          }
        }
      )
    );
  });

  it("registering multiple callbacks", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback1 = jest.fn();
          const callback2 = jest.fn();
          const hub = makeEventSource();

          hub.observable.subscribe(callback1);
          hub.notify(payload);

          hub.observable.subscribe(callback2);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1.mock.calls.length).toBe(3);
          for (const [arg] of callback1.mock.calls) {
            expect(arg).toBe(payload);
          }

          expect(callback2.mock.calls.length).toBe(2);
          for (const [arg] of callback2.mock.calls) {
            expect(arg).toBe(payload);
          }
        }
      )
    );
  });

  it("subscribing once", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = jest.fn();
          const hub = makeEventSource();

          const dereg1 = hub.observable.subscribeOnce(callback);
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback.mock.calls.length).toBe(1); // Called only once, not three times
          for (const [arg] of callback.mock.calls) {
            expect(arg).toBe(payload);
          }

          // Deregistering has no effect
          dereg1();
          hub.notify(payload);
          expect(callback.mock.calls.length).toBe(1); // Called only once, not three times
        }
      )
    );
  });

  it("deregisering usage", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback1 = jest.fn();
          const callback2 = jest.fn();
          const hub = makeEventSource();

          const dereg1 = hub.observable.subscribe(callback1);

          // Registering the same function instance multiple times has no
          // observable effect
          const dereg2a = hub.observable.subscribe(callback2);
          const dereg2b = hub.observable.subscribe(callback2);

          hub.notify(payload);
          hub.notify(payload);

          expect(callback1.mock.calls.length).toBe(2); // Both get updates
          expect(callback2.mock.calls.length).toBe(2);

          // Deregister callback1
          dereg1();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1.mock.calls.length).toBe(2); // Callback1 stopped getting updates
          expect(callback2.mock.calls.length).toBe(5); // Callback2 still receives updates

          // Deregister callback2
          dereg2a();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1.mock.calls.length).toBe(2); // Callback1 already stopped getting updates before
          expect(callback2.mock.calls.length).toBe(5); // Callback2 now also stopped getting them

          // Deregister callback2 again (has no effect)
          dereg2b();

          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback1.mock.calls.length).toBe(2); // Callback1 already stopped getting updates before
          expect(callback2.mock.calls.length).toBe(5); // Callback2 already stopped getting updates before
        }
      )
    );
  });

  it("awaiting events", async () => {
    const src = makeEventSource();
    const promise$ = src.waitUntil();

    // Now notify, so the promise will resolve
    src.notify(0);
    src.notify(1);
    src.notify(2);

    await expect(promise$).resolves.toBe(0);
  });

  it("awaiting events conditionally", async () => {
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

  it("pausing/continuing event delivery", () => {
    fc.assert(
      fc.property(
        anything(),

        (payload) => {
          const callback = jest.fn();
          const hub = makeEventSource();

          const unsub = hub.observable.subscribe(callback);

          hub.pause();
          hub.notify(payload);
          hub.notify(payload);
          hub.notify(payload);

          expect(callback.mock.calls.length).toBe(0); // No events get delivered until unpaused

          hub.unpause();
          expect(callback.mock.calls.length).toBe(3); // Buffered events get delivered

          // Deregister callback
          unsub();
        }
      )
    );
  });
});
