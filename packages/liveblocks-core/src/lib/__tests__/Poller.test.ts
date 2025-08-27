import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { makePoller } from "../Poller";

describe("Poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  test("should start the poller when condition is true", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc();

    // Fast-forward until all timers have been executed
    await vi.advanceTimersByTimeAsync(1000);

    // Expect the callback to be called after the interval
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("should stop the poller when condition is false", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc(); // Start the poller
    poller.dec(); // Stop the poller

    // Fast-forward time to check if polling stops
    await vi.advanceTimersByTimeAsync(3000);

    // Expect the callback not to be called since the poller was stopped
    expect(callback).toHaveBeenCalledTimes(0);
  });

  test("should also stop the poller when visibility state is false", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc(); // Start the poller
    poller.setInForeground(false); // Stops the poller

    // Fast-forward time to check if polling stops
    await vi.advanceTimersByTimeAsync(3000);

    // Expect the callback not to be called since the poller was stopped
    expect(callback).toHaveBeenCalledTimes(0);
  });

  test("should trigger a poll as soon as visibility state is toggled before stale time", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000, { maxStaleTimeMs: 500 }); // 1000ms interval

    poller.inc();
    poller.setInForeground(false);
    expect(callback).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(400);
    poller.setInForeground(true); // Becoming visible should instantly trigger a poll

    expect(callback).toHaveBeenCalledTimes(0);

    poller.dec();
  });

  test("should trigger a poll as soon as visibility state is toggled after stale time", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000, { maxStaleTimeMs: 500 }); // 1000ms interval

    poller.inc();
    poller.setInForeground(false);
    expect(callback).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTimeAsync(600);
    poller.setInForeground(true); // Becoming visible should instantly trigger a poll

    expect(callback).toHaveBeenCalledTimes(1);

    poller.dec();
  });

  test("should prevent polling overlap with async callback", async () => {
    // 0s    1s        3s    4s        6s    7s        9s
    // |-----|xxxxxxxxx|-----|xxxxxxxxx|-----|xxxxxxxxx|
    // Start   Poll 1          Poll 2          Poll 3
    //

    // Mock async callback that takes 2s to resolve
    const callback = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc();

    // Fast-forward time by 2000ms
    await vi.advanceTimersByTimeAsync(2000); // Move from 0s -> 2s on the timeline

    // The async callback should have been called (even though it hasn't finished yet)
    expect(callback).toHaveBeenCalledTimes(1);

    // Fast-forward another 2000ms, the callback should be invoked again
    await vi.advanceTimersByTimeAsync(1000); // Move from 2s -> 3s
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000); // Move from 3s -> 4s (where Poll 2 should happen)
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("should not start polling if already running", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc(); // Start the poller
    poller.inc();

    // Fast-forward by 3000ms
    await vi.advanceTimersByTimeAsync(3000);

    // Expect callback to be called only 3 times (once per interval)
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should handle enable/disable toggle", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.inc(); // Start polling

    // Fast-forward 1500ms (should call callback once after 1000ms)
    await vi.advanceTimersByTimeAsync(1500);
    expect(callback).toHaveBeenCalledTimes(1);

    poller.dec(); // Stop polling

    // Fast-forward another 1500ms (no more polling)
    await vi.advanceTimersByTimeAsync(1500);
    expect(callback).toHaveBeenCalledTimes(1); // No more calls
  });

  test("should keep the original polling schedule, even when disabled half-way", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 10_000); // 10s interval

    poller.inc(); // Start the poller

    // Forward 3s and stop the poller
    await vi.advanceTimersByTimeAsync(3000);
    poller.dec();

    // Forward 3s -> 6s and start + stop the poller
    await vi.advanceTimersByTimeAsync(3000);
    poller.inc();
    poller.dec();
    expect(callback).toHaveBeenCalledTimes(0);

    // Forward 6s -> 11s and start the poller
    await vi.advanceTimersByTimeAsync(5000);
    poller.inc();
    await vi.advanceTimersByTimeAsync(0);

    // A poll should now immediately happen (because it's been past 10 seconds
    // mark since the poller was originally started)
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("should not allow explicit poll when disabled", async () => {
    const callback = vi.fn();
    const poller = makePoller(callback, 1000);

    poller.dec();
    poller.setInForeground(true);

    // Fast-forward well beyond when the first poll is triggered
    await vi.advanceTimersByTimeAsync(100_000);
    expect(callback).toHaveBeenCalledTimes(0); // Should not poll, since polling is disabled
  });

  test("should poll immediately if stale (when called before first poll, short stale time)", async () => {
    // 0s        2s              5s
    // |--------------------------|
    // Start     ^              Poll 1 (natural)
    //           |
    //      Force poll here

    const callback = vi.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 1000 });

    poller.inc(); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(0);

    // Bring to foreground to trigger a poll right now
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(1);

    // 0s        2s                         7s
    // |---------|--------------------------|
    // Start     ^                       Poll 2 (natural)
    //           |
    //         Forced poll

    // Advance to what originally was the time the 1st poll
    await vi.advanceTimersByTimeAsync(3000); // Move from 2s -> 5s
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000); // Move from 5s -> 7s
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000); // Move from 10s -> 12s
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should poll immediately if stale (when called before first poll, but with larger stale time)", async () => {
    // 0s              3s         5s
    // |---------------|----------|
    // Start           |        Poll 1 (natural)
    //                 |
    //             Turned stale

    const callback = vi.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 3000 });

    poller.inc(); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await vi.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(0);

    // Bring to foreground to trigger a poll right now
    // Since we're currently at 4s (= beyond the stale time of 3s), a poll should happen
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(1);

    // 0s            4s                                 9s
    // |--------------|---------------------------------|
    // Start          ^                          Next natural poll
    //                |
    //             Forced poll

    // Advance to what originally was the time the 1st poll
    await vi.advanceTimersByTimeAsync(1000); // Move from 4s -> 5s
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000); // Move from 5s -> 7s
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s (crosses the 9s mark, so polls)
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000); // Move from 10s -> 12s
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("should poll immediately if stale (when called between two polls)", async () => {
    // 0s                         5s        7s              10s
    // |--------------------------|--------------------------|
    // Start                    Poll 1      ^              Poll 2 (natural)
    //                                      |
    //                                Force poll here

    const callback = vi.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 1000 });

    poller.inc(); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // Advance to beyond the 1st and 2nd poll
    await vi.advanceTimersByTimeAsync(7000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1 has happened

    // Bring to foreground to trigger a poll right now
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(2);

    // 0s                         5s        7s                         12s
    // |--------------------------|---------|--------------------------|
    // Start                    Poll 1      ^                        Poll 3 (natural)
    //                                      |
    //                                Force poll 2 here

    // Advance to what originally was the time the second poll should happen
    await vi.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s
    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3000); // Move from 10s -> 12s
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should not poll if a poll is already in progress", async () => {
    // 0s                         5s   6s                         11s
    // |--------------------------|xxxxx|--------------------------|
    // Start                      Poll 1                      Poll 2 (natural)
    //                               ^
    //                               |
    //                         Force poll here

    // Mock async callback that takes 1000ms to resolve
    const callback = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 0 });

    // Start the poller
    poller.inc();

    // Fast-forward to 5s on the timeline (to trigger Poll 1)
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Only one call since the poll is still in progress

    // Bring to foreground to trigger a poll right now
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(1); // Still only one call

    // Since no forced poll happened, the original natural polling schedule is intact
    // Forward to 11s to verify
    await vi.advanceTimersByTimeAsync(5000); // Forward from 5s -> 10s
    expect(callback).toHaveBeenCalledTimes(1); // Still only one call

    await vi.advanceTimersByTimeAsync(1000); // Forward from 10s -> 11s (when Poll 2 should happen)
    expect(callback).toHaveBeenCalledTimes(2); // Still only one call
  });

  test("should not poll if not stale", async () => {
    // 0s                         5s    6s                   10s
    // |--------------------------|--------------------------|
    // Start                   Poll 1                      Poll 2 (natural)
    //                                  ^
    //                                  |
    //                            Force poll here
    //                       (but it's not stale enough)

    const callback = vi.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 30000 });

    // Start the poller
    poller.inc();

    // Fast-forward to 5s
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Fast-forward from 5s -> 6s
    await vi.advanceTimersByTimeAsync(1000);

    // Bring to foreground
    poller.setInForeground(true); // Data is allowed to be 30 seconds old, so not stale

    // Fast-forward from 6s -> 10s
    await vi.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(2); // Poll 2
  });

  test("should force an immediate poll after markAsStale is called", async () => {
    // 0s                         5s    6s                   11s
    // |--------------------------|--------------------------|
    // Start                   Poll 1              Poll 3 (natural but offset
    //                                  ^        by 1s because the last poll was
    //                                  |             at 6s and not 5s)
    //                          markAsStale here
    //                          + pollNowIfStale
    //                       (forces immediate poll 2)

    const callback = vi.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 30000 });

    // Start the poller
    poller.inc();

    // Fast-forward to 5s
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Fast-forward from 5s -> 6s
    await vi.advanceTimersByTimeAsync(1000);

    // Mark as stale and poll
    poller.markAsStale();
    poller.pollNowIfStale(); // Should force a poll, ignoring maxStaleTimeMs since it was marked as stale
    expect(callback).toHaveBeenCalledTimes(2); // Forced poll 2

    // Fast-forward from 6s -> 11s
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(3); // Poll 3
  });

  test("should allow new polls when re-enabled, but not schedule extra polls after completion of an in-progress poll", async () => {
    // Mock async callback that takes 4s to resolve
    const callback = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });
    const poller = makePoller(callback, 1000);

    // Start the poller
    poller.inc();

    // Fast-forward to 1s when the first poll is triggered
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1 starts
    await vi.advanceTimersByTimeAsync(1000); // Poll 1 still in progress

    // Disable and enable while Poll 1 is still in progress
    poller.dec();
    poller.inc();

    await vi.advanceTimersByTimeAsync(1000); // Poll 1 finished
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000); // Poll 2 starts
    poller.dec();
    await vi.advanceTimersByTimeAsync(2000); // Poll 2 finishes

    expect(callback).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(2); // No new polls are getting scheduled
  });

  test("should abort long running ongoing poll", async () => {
    // Mock async callback that takes 2s to resolve
    const callback = vi.fn(async (signal: AbortSignal) => {
      await new Promise((resolve) => setTimeout(resolve, 40_000));
      signal.throwIfAborted();
    });
    const poller = makePoller(callback, 5000);

    // Start the poller
    poller.inc();

    // Fast-forward to 5s (polling interval)
    await vi.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance by 30s (which is longer than the time the poller callback takes to complete) and verify the signal was aborted
    await vi.advanceTimersByTimeAsync(30_000);
    const [signal] = callback.mock.calls[0];
    expect(signal.aborted).toBe(true);
  });

  test("should poll with exponential backoff on error", async () => {
    const callback = vi.fn(() => {
      throw new Error();
    });
    const poller = makePoller(callback, 2000);

    // Start the poller
    poller.inc();

    // Fast-forward to 2s
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Advance by 1s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    // Advance by 2s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(3);

    // Advance by 4s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(4);

    // Advance by 8s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(8000);
    expect(callback).toHaveBeenCalledTimes(5);

    // Advance by 10s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(6);

    // Advance by 10s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(7);

    // Advance by 10s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(8);
  });

  test("should poll with exponential backoff on error and use normal interval once successful", async () => {
    const callback = vi
      .fn()
      // First call - throw
      .mockImplementationOnce(() => {
        throw new Error("Error 1");
      })
      // Second call - throw
      .mockImplementationOnce(() => {
        throw new Error("Error 2");
      })
      // Third call - throw
      .mockImplementationOnce(() => {
        throw new Error("Error 3");
      })
      // Fourth and onward - success
      .mockImplementation(() => "Success");

    const poller = makePoller(callback, 2000);

    // Start the poller
    poller.inc();

    // Fast-forward to 2s
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Advance by 1s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    // Advance by 2s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(3);

    // Advance by 4s and verify that a new poll takes place
    await vi.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(4);

    // At this point, callback succeeds, so normal interval resumes
    await vi.advanceTimersByTimeAsync(2000); // Normal interval after success
    expect(callback).toHaveBeenCalledTimes(5);

    // Advance again by the normal interval and verify callback is called
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(6);

    // Confirm normal interval persists on further calls
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(7);

    // and so on
  });
});
