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

type State =
  | { state: "stopped" }
  | {
      state: "running";
      timeoutHandle: ReturnType<typeof setTimeout>;
      lastScheduledAt: number;
      lastPolledAt: number | null;
      pollPromise: Promise<void> | null;
    };

type Context = {
  isEnabled: boolean;
};

export function makePoller(
  callback: () => Promise<void> | void,
  interval: number
): Poller {
  let state: State = { state: "stopped" };
  const context: Context = {
    isEnabled: false,
  };

  function poll() {
    if (state.state === "running") {
      // XXX Set a max timeout for the `callback()` (make `callback` take
      // a signal, and protect each call with AbortSignal.timeout)
      //
      // XXX See discussion here:
      // https://github.com/liveblocks/liveblocks/pull/1962#discussion_r1787422911

      // If there's already a poll in progress, do not start a new one
      if (state.pollPromise !== null) {
        return;
      }

      state.pollPromise = Promise.resolve(callback());

      void state.pollPromise.finally(() => {
        if (state.state === "running") {
          schedule();
          state.lastPolledAt = performance.now();
        }
      });
    }
  }

  function schedule() {
    // XXX clearTimeout(...) ?
    state = {
      state: "running",
      lastScheduledAt: performance.now(),
      timeoutHandle: setTimeout(poll, interval),
      lastPolledAt: null,
      pollPromise: null,
    };
  }

  function start() {
    if (state.state === "running") {
      return;
    }

    schedule();
  }

  function stop() {
    if (state.state === "stopped") {
      return;
    }

    if (state.timeoutHandle) {
      clearTimeout(state.timeoutHandle);
    }
    state = { state: "stopped" };
  }

  function enable(condition: boolean) {
    context.isEnabled = condition;
    startOrStop();
  }

  function startOrStop() {
    if (context.isEnabled) {
      start();
    } else {
      stop();
    }
  }

  function pollNowIfStale(maxStaleTimeMs: number) {
    if (state.state !== "running") {
      return;
    }

    // If a poll is already in progress, do nothing
    if (state.pollPromise !== null) {
      return;
    }

    const lastPolledAt = state.lastPolledAt;

    if (!lastPolledAt || performance.now() - lastPolledAt > maxStaleTimeMs) {
      // Cancel any scheduled poll
      if (state.timeoutHandle) {
        clearTimeout(state.timeoutHandle);
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
