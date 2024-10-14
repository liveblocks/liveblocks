import { FSM } from "./fsm";

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

type Context = {
  cond1: boolean;
  cond2: boolean;
  lastSuccessfulPollAt: number | null;
};

type State = "@idle" | "@enabled" | "@polling";

type Event = { type: "START" } | { type: "STOP" } | { type: "POLL" };

export function makePoller(
  callback: () => Promise<void> | void,
  interval: number
): Poller {
  const context: Context = {
    cond1: false,
    cond2: true,
    lastSuccessfulPollAt: null,
  };

  function isPollingAllowed() {
    return context.cond1 && context.cond2;
  }

  const fsm = new FSM<object, Event, State>({})
    .addState("@idle")
    .addState("@enabled")
    .addState("@polling");

  fsm.addTransitions("@idle", { START: "@enabled" });
  fsm.addTransitions("@enabled", { STOP: "@idle", POLL: "@polling" });
  fsm.addTimedTransition("@enabled", interval, "@polling");

  fsm.onEnterAsync(
    "@polling",
    async () => {
      // XXX Set a max timeout for the `callback()` (make `callback` take
      // a signal, and protect each call with AbortSignal.timeout)
      //
      // XXX See discussion here:
      // https://github.com/liveblocks/liveblocks/pull/1962#discussion_r1787422911
      await callback();
      context.lastSuccessfulPollAt = performance.now();
    },
    () => (isPollingAllowed() ? "@enabled" : "@idle"), // When OK
    () => (isPollingAllowed() ? "@enabled" : "@idle") // When error
  );

  function enable(cond1: boolean) {
    context.cond1 = cond1;
    if (isPollingAllowed()) {
      fsm.send({ type: "START" });
    } else {
      fsm.send({ type: "STOP" });
    }
  }

  function pollNowIfStale(maxStaleTimeMs: number) {
    if (
      !context.lastSuccessfulPollAt ||
      performance.now() - context.lastSuccessfulPollAt > maxStaleTimeMs
    ) {
      fsm.send({ type: "POLL" });
    }
  }

  fsm.start();
  return {
    enable,
    pollNowIfStale,
  };
}
