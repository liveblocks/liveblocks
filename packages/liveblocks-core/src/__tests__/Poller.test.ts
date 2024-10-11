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

  test("should poll immediately if stale (when called before first poll, short stale time)", async () => {
    // 0s        2s              5s
    // |--------------------------|
    // Start     ^              Poll 1 (natural)
    //           |
    //      Force poll here

    const callback = jest.fn();
    const poller = makePoller(callback, 5000);

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await jest.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(0);

    // Call pollNowIfStale with a maxStaleTimeMs of 1000 (so it should poll)
    poller.pollNowIfStale(1000);

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
    const poller = makePoller(callback, 5000);

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // We're still before the first poll here
    await jest.advanceTimersByTimeAsync(2000);
    expect(callback).toHaveBeenCalledTimes(0);

    // Call pollNowIfStale with a maxStaleTimeMs of 30000
    // Since there is no initial data, it should immediately poll
    poller.pollNowIfStale(30000);

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
    const poller = makePoller(callback, 5000);

    poller.enable(true); // Start polling
    expect(callback).toHaveBeenCalledTimes(0);

    // Advance to beyond the 1st and 2nd poll
    await jest.advanceTimersByTimeAsync(7000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1 has happened

    // Call pollNowIfStale with a maxStaleTimeMs of 1000 (so it should poll)
    poller.pollNowIfStale(1000);

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
    const poller = makePoller(callback, 5000);

    // Start the poller
    poller.enable(true);

    // Fast-forward to 5s on the timeline (to trigger Poll 1)
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Only one call since the poll is still in progress

    // Fast-forward to 5.5s on the timeline (in the middle of Poll 1)
    poller.pollNowIfStale(0);

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
    const poller = makePoller(callback, 5000);

    // Start the poller
    poller.enable(true);

    // Fast-forward to 5s
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Poll 1

    // Fast-forward from 5s -> 6s
    await jest.advanceTimersByTimeAsync(1000);
    poller.pollNowIfStale(30000); // Data is allowed to be 30 seconds old, so not stale

    // Fast-forward from 6s -> 10s
    await jest.advanceTimersByTimeAsync(4000);
    expect(callback).toHaveBeenCalledTimes(2); // Poll 2
  });

  test.failing(
    "should allow new polls when re-enabled, but not schedule extra polls after completion of an in-progress poll",
    async () => {
      // Mock async callback that takes 4s to resolve
      const callback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      });
      const poller = makePoller(callback, 1000);

      // Start the poller
      poller.enable(true);

      // Fast-forward to 1s when the first poll is triggered
      await jest.advanceTimersByTimeAsync(1000);
      expect(callback).toHaveBeenCalledTimes(1); // Poll 1 (but the poll is still in progress)

      // Disable and enable the poller
      poller.enable(false);
      poller.enable(true);

      // Fast-forward 1s again when a new poll is triggered.
      // By this point, We're 2 seconds into the timeline and Poll 1 is still in progress.
      await jest.advanceTimersByTimeAsync(1000);
      expect(callback).toHaveBeenCalledTimes(2); // New Poll (while Poll1 is still in progress)

      // Fast-forward 2s
      // By this point, Poll 1 is complete. When the poll finishes, it should not schedule a new poll but it currently does!
      await jest.advanceTimersByTimeAsync(2000);
      expect(callback).toHaveBeenCalledTimes(2);
    }
  );
});
