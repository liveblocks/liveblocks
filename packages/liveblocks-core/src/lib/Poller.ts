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
};

type Context = {
  enabled: boolean; // Whether user has .enable()'ed the poller
  inForeground: boolean; // Whether the visibility state is visible
  lastSuccessfulPollAt: number | null;
};

type State =
  | "@idle" //
  | "@enabled" //
  | "@polling";

type Event =
  | { type: "START" } //
  | { type: "STOP" } //
  | { type: "POLL" };

/**
 * Makes a poller that will call `await callback()` at the desired interval (in
 * millis).
 *
 * The poller has only two public APIs, both side effects:
 * - .enable(condition: boolean): void
 *
 * It has the following behaviors/guarantees:
 * - Performing a "poll" literally means calling the provided callback (and
 *   awaiting it)
 * - It will only ever poll if .enable(true) was called.
 * - It will not _immediately_ poll if .enable(true) is called. The first poll
 *   can be expected no earlier than the specified interval.
 * - If .enable(false) is called it stops the poller. This means that any next
 *   poll will get unscheduled. If .enable(false) is called while a poll is
 *   ongoing, it will finish that one first, but after that stop polling.
 * - If the document's visibility state changes to hidden (tab is moved to the
 *   background), polling will stop until the document's made visible again
 * - If the document becomes visible again, the poller will:
 *   - Still do nothing if the poller isn't enabled
 *   - Still do nothing if the poller is enabled, but the last time a poll
 *     happened recently enough (= less than the maxStaleTimeMs, which defaults
 *     to infinity)
 *   - Trigger a poll right away otherwise. If an existing poll was already
 *     scheduled, think of it as if this future poll is "earlied" and just
 *     happening right now instead
 */
export function makePoller(
  callback: (signal: AbortSignal) => Promise<void> | void,
  intervalMs: number,
  options?: {
    maxStaleTimeMs?: number;
  }
): Poller {
  const doc = typeof document !== "undefined" ? document : undefined;
  const win = typeof window !== "undefined" ? window : undefined;

  const maxStaleTimeMs = options?.maxStaleTimeMs ?? Number.POSITIVE_INFINITY;
  const context: Context = {
    enabled: false,
    inForeground: doc?.visibilityState !== "hidden",
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
    async (_ctx, signal) => {
      await callback(signal);
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

  /**
   * Polls immediately only if it has been more than `maxStaleTimeMs` milliseconds since
   * the last poll and no poll is currently in progress. After polling, schedules
   * the next poll at the regular interval.
   */
  function pollNowIfStale() {
    if (
      !context.lastSuccessfulPollAt ||
      performance.now() - context.lastSuccessfulPollAt > maxStaleTimeMs
    ) {
      fsm.send({ type: "POLL" });
    }
  }

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

    // Internal API, used by unit tests only to simulate visibility events
    setInForeground,
  };
}
