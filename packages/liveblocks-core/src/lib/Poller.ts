type Poller = {
  /**
   * Starts or stops the poller, based on the given condition. When true,
   * starts the poller if it hasn't been started already. When false, stops the
   * poller if it hasn't been stopped already.
   */
  enable(condition: boolean): void;

  /**
   * Polls immediately only if it has been more than `maxStaleTimeMs` milliseconds since
   * the last poll and no poll is currently in progress. After polling, schedules
   * the next poll at the regular interval.
   */
  pollNowIfStale(maxStaleTimeMs: number): void;
};

type Context =
  | { state: "stopped" }
  | {
      state: "running";
      timeoutHandle: ReturnType<typeof setTimeout>;
      lastScheduledAt: number;
      lastPolledAt: number | null;
      pollPromise: Promise<void> | null;
    };

export function makePoller(
  callback: () => Promise<void> | void,
  interval: number
): Poller {
  let context: Context = { state: "stopped" };

  function poll() {
    if (context.state === "running") {
      // XXX Set a max timeout for the `callback()` (make `callback` take
      // a signal, and protect each call with AbortSignal.timeout)
      //
      // XXX See discussion here:
      // https://github.com/liveblocks/liveblocks/pull/1962#discussion_r1787422911

      // If there's already a poll in progress, do not start a new one
      if (context.pollPromise !== null) {
        return;
      }

      context.pollPromise = Promise.resolve(callback());

      void context.pollPromise.finally(() => {
        if (context.state === "running") {
          schedule();
          context.lastPolledAt = performance.now();
        }
      });
    }
  }

  function schedule() {
    context = {
      state: "running",
      lastScheduledAt: performance.now(),
      timeoutHandle: setTimeout(poll, interval),
      lastPolledAt: null,
      pollPromise: null,
    };
  }

  function start() {
    if (context.state === "running") {
      return;
    }

    schedule();
  }

  function stop() {
    if (context.state === "stopped") {
      return;
    }

    if (context.timeoutHandle) {
      clearTimeout(context.timeoutHandle);
    }
    context = { state: "stopped" };
  }

  function enable(condition: boolean) {
    if (condition) {
      start();
    } else {
      stop();
    }
  }

  function pollNowIfStale(maxStaleTimeMs: number) {
    if (context.state !== "running") {
      return;
    }

    // If a poll is already in progress, do nothing
    if (context.pollPromise !== null) {
      return;
    }

    const lastPolledAt = context.lastPolledAt ?? 0;

    if (performance.now() - lastPolledAt > maxStaleTimeMs) {
      // Cancel any scheduled poll
      if (context.timeoutHandle) {
        clearTimeout(context.timeoutHandle);
      }

      // Start polling immediately
      void poll();
    }
  }

  return {
    enable,
    pollNowIfStale,
  };
}
