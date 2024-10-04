type Poller = {
  /**
   * Starts or stops the poller, based on the given condition. When true,
   * starts the poller if it hasn't been started already. When false, stops the
   * poller if it hasn't been stopped already.
   */
  enable(condition: boolean): void;
};

type Context =
  | { state: "stopped" }
  | {
      state: "running";
      timeoutHandle: ReturnType<typeof setTimeout>;
      lastScheduledAt: number;
    };

export function makePoller(
  callback: () => Promise<void> | void,
  interval: number
): Poller {
  let context: Context = { state: "stopped" };

  function poll() {
    if (context.state === "running") {
      schedule();
    }

    void callback();
  }

  function schedule() {
    context = {
      state: "running",
      lastScheduledAt: performance.now(),
      timeoutHandle: setTimeout(poll, interval),
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

  return {
    enable,
  };
}
