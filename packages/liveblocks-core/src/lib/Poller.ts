type Poller = {
  start(interval: number): void;
  restart(interval: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
};

type Context =
  | {
      state: "stopped";
      timeoutHandle: null;
      interval: null;
      lastScheduledAt: null;
      remainingInterval: null;
    }
  | {
      state: "running";
      timeoutHandle: ReturnType<typeof setTimeout>;
      interval: number;
      lastScheduledAt: number;
      remainingInterval: null;
    }
  | {
      state: "paused";
      timeoutHandle: null;
      interval: number;
      lastScheduledAt: number;
      remainingInterval: number;
    };

export function makePoller(callback: () => Promise<void> | void): Poller {
  let context: Context = {
    state: "stopped",
    timeoutHandle: null,
    interval: null,
    lastScheduledAt: null,
    remainingInterval: null,
  };

  function poll() {
    if (context.state === "running") {
      schedule(context.interval);
    }

    void callback();
  }

  function schedule(interval: number) {
    context = {
      state: "running",
      interval: context.state !== "stopped" ? context.interval : interval,
      lastScheduledAt: performance.now(),
      timeoutHandle: setTimeout(poll, interval),
      remainingInterval: null,
    };
  }

  function scheduleRemaining(remaining: number) {
    if (context.state !== "paused") {
      return;
    }

    context = {
      state: "running",
      interval: context.interval,
      lastScheduledAt: context.lastScheduledAt,
      timeoutHandle: setTimeout(poll, remaining),
      remainingInterval: null,
    };
  }

  function start(interval: number) {
    if (context.state === "running") {
      return;
    }

    schedule(interval);
  }

  function restart(interval: number) {
    stop();
    start(interval);
  }

  function pause() {
    if (context.state !== "running") {
      return;
    }

    clearTimeout(context.timeoutHandle);

    context = {
      state: "paused",
      interval: context.interval,
      lastScheduledAt: context.lastScheduledAt,
      timeoutHandle: null,
      remainingInterval:
        context.interval - (performance.now() - context.lastScheduledAt),
    };
  }

  function resume() {
    if (context.state !== "paused") {
      return;
    }

    scheduleRemaining(context.remainingInterval);
  }

  function stop() {
    if (context.state === "stopped") {
      return;
    }

    if (context.timeoutHandle) {
      clearTimeout(context.timeoutHandle);
    }

    context = {
      state: "stopped",
      interval: null,
      lastScheduledAt: null,
      timeoutHandle: null,
      remainingInterval: null,
    };
  }

  return {
    start,
    restart,
    pause,
    resume,
    stop,
  };
}
