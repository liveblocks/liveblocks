import { describe, expect, onTestFinished, test, vi } from "vitest";

import { makePipe } from "~/lib/Pipe.js";

/**
 * Sets up a pipe test:
 * - Create a new Pipe instance
 * - Connect a mock callback
 *
 * After test:
 * - Automatically unsubscribes the callback
 * - Automatically await dangling promises
 *
 * Returns:
 * - The pipe, and the callback.
 */
function makePipeTest() {
  const pipe = makePipe();
  const callback = vi.fn();
  const unsub = pipe.output.subscribe(callback);

  onTestFinished(
    async () => {
      unsub();
      await pipe.flush();
    },

    // Allow for max 1 second
    1000
  );

  return { pipe, callback };
}

function useFakeTimers() {
  vi.useFakeTimers();
  onTestFinished(() => void vi.useRealTimers());
}

describe("Pipe (a testing utility, how meta)", () => {
  test("empty", () => {
    const { callback } = makePipeTest();
    expect(callback).not.toHaveBeenCalled();
  });

  test("auto flush control", async () => {
    useFakeTimers();
    const { pipe, callback } = makePipeTest();

    pipe.send("one");
    pipe.send("two");

    expect(callback).not.toHaveBeenCalled();

    // Callback will be invoked asynchronously
    await vi.advanceTimersByTimeAsync(1); // Advance by 1ms
    expect(callback).toHaveBeenNthCalledWith(1, "one");
    expect(callback).toHaveBeenNthCalledWith(2, "two");
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("manual flush control", async () => {
    useFakeTimers();
    const { pipe, callback } = makePipeTest();
    pipe.setManual();

    pipe.send("one");
    pipe.send("two");

    expect(callback).not.toHaveBeenCalled();

    // Callback will be invoked asynchronously
    await vi.advanceTimersByTimeAsync(1000); // Advance does nothing yet
    expect(callback).not.toHaveBeenCalled();

    // ...until flushed
    void pipe.flush();
    await vi.advanceTimersByTimeAsync(1); // Advance by 1ms

    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("toggling to auto flushes immediately", async () => {
    useFakeTimers();
    const { pipe, callback } = makePipeTest();
    pipe.setManual();

    pipe.send("one");
    pipe.send("two");

    expect(callback).not.toHaveBeenCalled();

    // Callback will be invoked asynchronously
    await vi.advanceTimersByTimeAsync(1000); // Advance does nothing yet
    expect(callback).not.toHaveBeenCalled();

    // ...until flushed
    pipe.setAuto();
    await vi.advanceTimersByTimeAsync(1); // Advance by 1ms

    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("pipes serialize/deserialize their payloads", async () => {
    useFakeTimers();
    const { pipe, callback } = makePipeTest();
    pipe.setManual();

    // @ts-expect-error - deliberately not valid JSON
    pipe.send(new Date("2024-01-01"));
    // @ts-expect-error - deliberately not valid JSON
    pipe.send(new Error("I am an error"));

    expect(callback).not.toHaveBeenCalled();

    // Callback will be invoked asynchronously
    await vi.advanceTimersByTimeAsync(1000); // Advance does nothing yet
    expect(callback).not.toHaveBeenCalled();

    // ...until flushed
    pipe.setAuto();
    await vi.advanceTimersByTimeAsync(1); // Advance by 1ms

    // They will come out as strings on the other end of the pipe
    expect(callback).toHaveBeenNthCalledWith(1, "2024-01-01T00:00:00.000Z"); // Comes out as a string
    expect(callback).toHaveBeenNthCalledWith(2, {}); // Comes out as an empty object
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
