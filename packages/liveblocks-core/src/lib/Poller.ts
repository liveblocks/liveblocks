import { FSM } from "./fsm";

// TODO LIST:
// XXX Model the "becoming available of lastRequestedAt date" as another poller precondition?
// XXX Centralize logging of falied polls in the poller itself: "Polling new inbox notifications failed"
// XXX Think about the _initial_ poll that is now being triggered by the pollNowIfStale() call when a component mounts. Typically the initial data has not been loaded yet, so polling should not really happen yet either.

export type Poller = {
  /**
   * Increments the subscriber count for this poller. If it becomes > 0, the
   * poller will be enabled.
   */
  inc(): void;
  /**
   * Decrements the subscriber count for this poller. If it becomes = 0, the
   * poller will be disabled.
   */
  dec(): void;

  /**
   * Polls immediately only if it has been more than `maxStaleTimeMs` milliseconds since
   * the last poll and no poll is currently in progress. After polling, schedules
   * the next poll at the regular interval.
   */
  pollNowIfStale(): void;

  /**
   * Used in unit tests only.
   * @internal
   */
  setInForeground(condition: boolean): void;
};

type Context = {
  inForeground: boolean; // Whether the visibility state is visible
  lastSuccessfulPollAt: number | null;
  count: number; // Subscriber count
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
 * The poller has only three public APIs, all side effects:
 * - .inc(): void
 * - .dec(): void
 * - .pollNowIfStale(): void
 *
 * It has the following behaviors/guarantees:
 * - Performing a "poll" literally means calling the provided callback (and
 *   awaiting it)
 * - It will only ever start polling if .inc() was called (more often than .dec())
 * - It will not _immediately_ poll if .inc() is called. The first poll
 *   can be expected no earlier than the specified interval.
 * - If .dec() is called as many times as .inc(), it stops the poller. This
 *   means that any next poll will get unscheduled. If .dev() is called while
 *   a poll is ongoing, it will still finish that poll, but after that stop
 *   further polling.
 * - If the document's visibility state changes to hidden (tab is moved to the
 *   background), polling will be paused until the document's made visible again
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
  const startTime = performance.now();
  const doc = typeof document !== "undefined" ? document : undefined;
  const win = typeof window !== "undefined" ? window : undefined;

  const maxStaleTimeMs = options?.maxStaleTimeMs ?? Number.POSITIVE_INFINITY;
  const context: Context = {
    inForeground: doc?.visibilityState !== "hidden",
    lastSuccessfulPollAt: null,
    count: 0,
  };

  function mayPoll() {
    return context.count > 0 && context.inForeground;
  }

  /**
   *                                    +----------+
   *        +-------------------------> |  @idle   |
   *        |   else                    +----------+
   *        |                             |      ^
   *        |                     on STOP |      | on START
   *        |                             v      |
   *   +--------+   if mayPoll()        +----------+      on POLL             +----------+
   *   | decide |---------------------> | @enabled | -----------------------> | @polling |
   *   +--------+                       +----------+   after POLL_INTERVAL    +----------+
   *        ^                                                                      |
   *        |                                                                      |
   *        +----------------------------------------------------------------------+
   */
  const fsm = new FSM<object, Event, State>({})
    .addState("@idle")
    .addState("@enabled")
    .addState("@polling");

  fsm.addTransitions("@idle", { START: "@enabled" });
  fsm.addTransitions("@enabled", { STOP: "@idle", POLL: "@polling" });
  fsm.addTimedTransition(
    "@enabled",
    () => {
      const lastPoll = context.lastSuccessfulPollAt ?? startTime;
      const nextPoll = lastPoll + intervalMs;
      return Math.max(0, nextPoll - performance.now());
    },
    "@polling"
  );

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

  function inc() {
    context.count++;
    startOrStop();
  }

  function dec() {
    context.count--;
    if (context.count < 0) {
      context.count = 0;
    }
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

  function setInForeground(inForeground: boolean) {
    context.inForeground = inForeground;
    startOrStop();
    pollNowIfStale(); // Won't do anything if in @idle
  }

  function onVisibilityChange() {
    setInForeground(doc?.visibilityState !== "hidden");
  }

  // NOTE: Currently, poller instances are only ever created and never
  // destroyed. If we add a destroy() method in the future, then we should also
  // unregister these event handlers.
  doc?.addEventListener("visibilitychange", onVisibilityChange);
  win?.addEventListener("online", onVisibilityChange);

  fsm.start();
  return {
    inc,
    dec,
    pollNowIfStale,

    // Internal API, used by unit tests only to simulate visibility events
    setInForeground,
  };
}
