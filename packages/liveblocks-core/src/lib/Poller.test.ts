import { makePoller } from "../lib/Poller";

describe("Poller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("should start the poller when condition is true", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true);

    // Fast-forward until all timers have been executed
    await jest.advanceTimersByTimeAsync(1000);

    // Expect the callback to be called after the interval
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("should stop the poller when condition is false", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true); // Start the poller
    poller.enable(false); // Stop the poller

    // Fast-forward time to check if polling stops
    await jest.advanceTimersByTimeAsync(3000);

    // Expect the callback not to be called since the poller was stopped
    expect(callback).toHaveBeenCalledTimes(0);
  });

  test("should also stop the poller when visibility state is false", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true); // Start the poller
    poller.setInForeground(false); // Stops the poller

    // Fast-forward time to check if polling stops
    await jest.advanceTimersByTimeAsync(3000);

    // Expect the callback not to be called since the poller was stopped
    expect(callback).toHaveBeenCalledTimes(0);
  });

  test("should trigger a poll as soon as visibility state is toggled", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true);
    poller.setInForeground(false);
    expect(callback).toHaveBeenCalledTimes(0);

    poller.setInForeground(true); // Becoming visible should instantly trigger a poll
    await jest.advanceTimersByTimeAsync(500);
    expect(callback).toHaveBeenCalledTimes(1);

    poller.enable(false);
  });

  test("should prevent polling overlap with async callback", async () => {
    // 0s    1s        3s    4s        6s    7s        9s
    // |-----|xxxxxxxxx|-----|xxxxxxxxx|-----|xxxxxxxxx|
    // Start   Poll 1          Poll 2          Poll 3
    //

    // Mock async callback that takes 2s to resolve
    const callback = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true);

    // Fast-forward time by 2000ms
    await jest.advanceTimersByTimeAsync(2000); // Move from 0s -> 2s on the timeline

    // The async callback should have been called (even though it hasn't finished yet)
    expect(callback).toHaveBeenCalledTimes(1);

    // Fast-forward another 2000ms, the callback should be invoked again
    await jest.advanceTimersByTimeAsync(1000); // Move from 2s -> 3s
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000); // Move from 3s -> 4s (where Poll 2 should happen)
    expect(callback).toHaveBeenCalledTimes(2);
  });

  test("should not start polling if already running", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true); // Start the poller
    poller.enable(true); // Attempt to start it again

    // Fast-forward by 3000ms
    await jest.advanceTimersByTimeAsync(3000);

    // Expect callback to be called only 3 times (once per interval)
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should handle enable/disable toggle", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true); // Start polling

    // Fast-forward 1500ms (should call callback once after 1000ms)
    await jest.advanceTimersByTimeAsync(1500);
    expect(callback).toHaveBeenCalledTimes(1);

    poller.enable(false); // Stop polling

    // Fast-forward another 1500ms (no more polling)
    await jest.advanceTimersByTimeAsync(1500);
    expect(callback).toHaveBeenCalledTimes(1); // No more calls
  });

  test("should not allow explicit poll when disabled", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 1000);

    poller.enable(false);
    poller.setInForeground(true);

    // Fast-forward well beyond when the first poll is triggered
    await jest.advanceTimersByTimeAsync(100_000);
    expect(callback).toHaveBeenCalledTimes(0); // Should not poll, since polling is disabled
  });

  test("should poll immediately if stale (when called before first poll, short stale time)", async () => {
    // 0s        2s              5s
    // |--------------------------|
    // Start     ^              Poll 1 (natural)
    //           |
    //      Force poll here

    const callback = jest.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 1000 });

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await jest.advanceTimersByTimeAsync(2000);
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
    await jest.advanceTimersByTimeAsync(3000); // Move from 2s -> 5s
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000); // Move from 5s -> 7s
    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s
    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2000); // Move from 10s -> 12s
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should poll immediately if stale (when called before first poll, but with larger stale time)", async () => {
    // 0s        2s              5s
    // |--------------------------|
    // Start     ^              Poll 1 (natural)
    //           |
    //      Force poll here

    const callback = jest.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 30000 });

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await jest.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(0);

    // Bring to foreground to trigger a poll right now
    // Since there is no initial data, it should immediately poll
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(1);

    // 0s        2s                         7s
    // |---------|--------------------------|
    // Start     ^                       Poll 2 (natural)
    //           |
    //         Forced poll

    // Advance to what originally was the time the 1st poll
    await jest.advanceTimersByTimeAsync(3000); // Move from 2s -> 5s
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(2000); // Move from 5s -> 7s
    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s
    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2000); // Move from 10s -> 12s
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test("should poll immediately if stale (when called between two polls)", async () => {
    // 0s                         5s        7s              10s
    // |--------------------------|--------------------------|
    // Start                    Poll 1      ^              Poll 2 (natural)
    //                                      |
    //                                Force poll here

    const callback = jest.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 1000 });

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // Advance to beyond the 1st and 2nd poll
    await jest.advanceTimersByTimeAsync(7000);
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
    await jest.advanceTimersByTimeAsync(3000); // Move from 7s -> 10s
    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(3000); // Move from 10s -> 12s
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
    const callback = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 0 });

    // Start the poller
    poller.enable(true);

    // Fast-forward to 5s on the timeline (to trigger Poll 1)
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Only one call since the poll is still in progress

    // Bring to foreground to trigger a poll right now
    poller.setInForeground(true);

    expect(callback).toHaveBeenCalledTimes(1); // Still only one call

    // Since no forced poll happened, the original natural polling schedule is intact
    // Forward to 11s to verify
    await jest.advanceTimersByTimeAsync(5000); // Forward from 5s -> 10s
    expect(callback).toHaveBeenCalledTimes(1); // Still only one call

    await jest.advanceTimersByTimeAsync(1000); // Forward from 10s -> 11s (when Poll 2 should happen)
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

    const callback = jest.fn();
    const poller = makePoller(callback, 5000, { maxStaleTimeMs: 30000 });

    // Start the poller
    poller.enable(true);

    // Fast-forward to 5s
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Fast-forward from 5s -> 6s
    await jest.advanceTimersByTimeAsync(1000);

    // Bring to foreground
    poller.setInForeground(true); // Data is allowed to be 30 seconds old, so not stale

    // Fast-forward from 6s -> 10s
    await jest.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(2); // Poll 2
  });

  test("should allow new polls when re-enabled, but not schedule extra polls after completion of an in-progress poll", async () => {
    // Mock async callback that takes 4s to resolve
    const callback = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });
    const poller = makePoller(callback, 1000);

    // Start the poller
    poller.enable(true);

    // Fast-forward to 1s when the first poll is triggered
    await jest.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1 starts
    await jest.advanceTimersByTimeAsync(1000); // Poll 1 still in progress

    // Disable and enable while Poll 1 is still in progress
    poller.enable(false);
    poller.enable(true);

    await jest.advanceTimersByTimeAsync(1000); // Poll 1 finished
    expect(callback).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1000); // Poll 2 starts
    poller.enable(false);
    await jest.advanceTimersByTimeAsync(2000); // Poll 2 finishes

    expect(callback).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(10000);
    expect(callback).toHaveBeenCalledTimes(2); // No new polls are getting scheduled
  });
});
