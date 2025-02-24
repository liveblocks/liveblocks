import { FSM } from "./fsm";

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
  lastSuccessfulPollAt: number; // The timestamp of the last successful poll (or when the poller was initialized)
  count: number; // Subscriber count
  backoff: number; // Backoff delay in ms
};

type State =
  | "@idle" //
  | "@enabled" //
  | "@polling";

type Event =
  | { type: "START" } //
  | { type: "STOP" } //
  | { type: "POLL" };

const BACKOFF_DELAYS = [1_000, 2_000, 4_000, 8_000, 10_000] as const;

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
    lastSuccessfulPollAt: startTime,
    count: 0,
    backoff: 0,
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
      const lastPoll = context.lastSuccessfulPollAt;
      const nextPoll = lastPoll + intervalMs;
      return Math.max(0, nextPoll - performance.now()) + context.backoff;
    },
    "@polling"
  );

  fsm.onEnterAsync(
    "@polling",
    async (_ctx, signal) => {
      await callback(signal);
      if (!signal.aborted) {
        context.lastSuccessfulPollAt = performance.now();
      }
    },
    // When OK
    () => {
      return {
        target: mayPoll() ? "@enabled" : "@idle",
        effect: () => {
          // Reset backoff delay to 0 if the callback was successful
          context.backoff = 0;
        },
      };
    },
    // When error
    () => {
      return {
        target: mayPoll() ? "@enabled" : "@idle",
        effect: () => {
          // Increase the backoff delay if an error occured
          context.backoff =
            BACKOFF_DELAYS.find((delay) => delay > context.backoff) ??
            BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1];
        },
      };
    },
    30_000 // Abort the poll if the callback takes more than 30 seconds to complete
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
    if (performance.now() - context.lastSuccessfulPollAt > maxStaleTimeMs) {
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
  win?.addEventListener("focus", pollNowIfStale);

  fsm.start();
  return {
    inc,
    dec,
    pollNowIfStale,

    // Internal API, used by unit tests only to simulate visibility events
    setInForeground,
  };
}
