import { FSM } from "./fsm";

type Poller = {
  /**
   * Starts or stops the poller, based on the given condition. When true,
   * starts the poller if it hasn't been started already. When false, stops the
   * poller if it hasn't been stopped already.
   */
  enable(condition: boolean): void;

  /**
   * Used in unit tests only.
   * @internal
   */
  setInForeground(condition: boolean): void;

  /**
   * Polls immediately only if it has been more than `maxStaleTimeMs` milliseconds since
   * the last poll and no poll is currently in progress. After polling, schedules
   * the next poll at the regular interval.
   */
  pollNowIfStale(): void;
};

type Context = {
  enabled: boolean; // Whether user has .enable()'ed the poller
  inForeground: boolean; // Whether the visibility state is visible
  lastSuccessfulPollAt: number | null;
};

type State = "@idle" | "@enabled" | "@polling";

type Event = { type: "START" } | { type: "STOP" } | { type: "POLL" };

export function makePoller(
  callback: () => Promise<void> | void,
  intervalMs: number,
  maxStaleTimeMs: number = intervalMs
): Poller {
  const context: Context = {
    enabled: false,
    inForeground: true,
    lastSuccessfulPollAt: null,
  };

  function mayPoll() {
    return context.enabled && context.inForeground;
  }

  const fsm = new FSM<object, Event, State>({})
    .addState("@idle")
    .addState("@enabled")
    .addState("@polling");

  fsm.addTransitions("@idle", { START: "@enabled" });
  fsm.addTransitions("@enabled", { STOP: "@idle", POLL: "@polling" });
  fsm.addTimedTransition("@enabled", intervalMs, "@polling");

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
    () => (mayPoll() ? "@enabled" : "@idle"), // When OK
    () => (mayPoll() ? "@enabled" : "@idle") // When error
  );

  function startOrStop() {
    if (mayPoll()) {
      fsm.send({ type: "START" });
    } else {
      fsm.send({ type: "STOP" });
    }
  }

  function enable(condition: boolean) {
    context.enabled = condition;
    startOrStop();
  }

  function pollNowIfStale() {
    if (
      !context.lastSuccessfulPollAt ||
      performance.now() - context.lastSuccessfulPollAt > maxStaleTimeMs
    ) {
      fsm.send({ type: "POLL" });
    }
  }

  const doc = typeof document !== "undefined" ? document : undefined;
  const win = typeof window !== "undefined" ? window : undefined;

  function setInForeground(inForeground: boolean) {
    context.inForeground = inForeground;
    startOrStop();
    pollNowIfStale(); // Won't do anything if in @idle
  }

  function onVisibilityChange() {
    setInForeground(doc?.visibilityState !== "hidden");
  }

  doc?.addEventListener("visibilitychange", onVisibilityChange);
  win?.addEventListener("online", onVisibilityChange);

  // XXX Remove this event listener if the poller would get destroyed?
  // doc?.removeEventListener("visibilitychange", onVisibilityChange);
  // win?.removeEventListener("online", onVisibilityChange);

  fsm.start();
  return {
    enable,
    pollNowIfStale,

    // Private API
    setInForeground,
  };
}
