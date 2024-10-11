import { makePoller } from "../lib/Poller";

// Mock timers using Jest
jest.useFakeTimers();

describe("Poller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
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
    // Mock async callback that takes 1500ms to resolve
    const callback = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    });

    const poller = makePoller(callback, 1000); // 1000ms interval

    poller.enable(true);

    // Fast-forward time by 2000ms
    await jest.advanceTimersByTimeAsync(2000);

    // Since the async callback takes 1500ms, it should only have been called once
    expect(callback).toHaveBeenCalledTimes(1);

    // Fast-forward another 1500ms, the callback should be invoked again
    await jest.advanceTimersByTimeAsync(1500);

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

  test("should poll immediately if stale", () => {
    global.performance.now = jest.fn(() => 1500); // Mock performance.now to return our fake time

    const callback = jest.fn();
    const poller = makePoller(callback, 5000);

    poller.enable(true); // Start polling

    // Call pollNowIfStale with a maxStaleTimeMs of 1000 (so it should poll)
    poller.pollNowIfStale(1000);

    expect(callback).toHaveBeenCalled(); // Ensure callback was called
  });

  test("should not poll if a poll is already in progress", async () => {
    // Mock async callback that takes 1000ms to resolve
    const callback = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });
    const poller = makePoller(callback, 5000);

    // Start the poller
    poller.enable(true);

    // Fast-forward 5000ms (should call callback once after 1000ms)
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1); // Only one call since the poll is still in progress

    // Call pollNowIfStale immediately (this should not trigger a new poll since one is in progress)
    poller.pollNowIfStale(1000);

    expect(callback).toHaveBeenCalledTimes(1); // Still only one call
  });

  test("should not poll if not stale", async () => {
    const callback = jest.fn();
    const poller = makePoller(callback, 5000);

    // Start the poller
    poller.enable(true);

    // Fast-forward 1500ms (should call callback once after 1000ms)
    await jest.advanceTimersByTimeAsync(5000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Fast-forward 500ms
    await jest.advanceTimersByTimeAsync(500);

    poller.pollNowIfStale(1000);
    expect(callback).toHaveBeenCalledTimes(1); // Still only one call
  });
});
