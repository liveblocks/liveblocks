/**
 * A generic Finite State Machine (FSM) implementation.
 *
 * This is a generic implementation that is not Liveblocks specific. We could
 * put this in a separate NPM package if we wanted to make this more reusable.
 */

import type { EventSource, Observable } from "./EventSource";
import { makeEventSource } from "./EventSource";

/**
 * Built-in event sent by .addTimedTransition().
 */
export type TimerEvent = { readonly type: "TIMER" };

/**
 * Built-in events sent by .onEnterAsync().
 */
export type AsyncOKEvent<T> = {
  readonly type: "ASYNC_OK";
  readonly data: T;
};
export type AsyncErrorEvent = {
  readonly type: "ASYNC_ERROR";
  readonly reason: unknown;
};

export type BaseEvent = { readonly type: string };
export type BuiltinEvent = TimerEvent | AsyncOKEvent<unknown> | AsyncErrorEvent;

export type Patchable<TContext> = Readonly<TContext> & {
  patch(patch: Partial<TContext>): void;
};

export type CleanupFn<TContext> = (context: Patchable<TContext>) => void;
export type EnterFn<TContext> = (
  context: Patchable<TContext>
) => void | CleanupFn<TContext>;

export type TargetFn<
  TContext extends object,
  TEvent extends BaseEvent,
  TState extends string,
> = (
  event: TEvent,
  context: Readonly<TContext>
) => TState | TargetObject<TContext, TEvent, TState> | null;

export type Effect<TContext, TEvent extends BaseEvent> = (
  context: Patchable<TContext>,
  event: TEvent
) => void;

/**
 * "Expanded" object form to specify a target state with.
 */
export type TargetObject<
  TContext extends object,
  TEvent extends BaseEvent,
  TState extends string,
> = {
  target: TState;

  /**
   * Emit a side effect (other than assigning to the context) when this
   * transition is taken.
   */
  effect: Effect<TContext, TEvent> | Effect<TContext, TEvent>[];
};

export type Target<
  TContext extends object,
  TEvent extends BaseEvent,
  TState extends string,
> =
  | TState // Static, e.g. 'complete'
  | TargetObject<TContext, TEvent, TState>
  | TargetFn<TContext, TEvent, TState>; // Dynamic, e.g. (context) => context.x ? 'complete' : 'other'

type Groups<T extends string> = T extends `${infer G}.${infer Rest}`
  ? G | `${G}.${Groups<Rest>}`
  : never;
export type Wildcard<T extends string> = "*" | `${Groups<T>}.*`;

/** State or one of its parent group patterns (e.g., "foo.bar.baz" | "foo.bar.*" | "foo.*") */
export type StateOrGroupPattern<T extends string> = T | `${Groups<T>}.*`;

function distance(state1: string, state2: string): [number, number] {
  if (state1 === state2) {
    return [0, 0];
  }

  const chunks1 = state1.split(".");
  const chunks2 = state2.split(".");
  const minLen = Math.min(chunks1.length, chunks2.length);
  let shared = 0;
  for (; shared < minLen; shared++) {
    if (chunks1[shared] !== chunks2[shared]) {
      break;
    }
  }

  const up = chunks1.length - shared;
  const down = chunks2.length - shared;
  return [up, down];
}

function patterns<TState extends string>(
  targetState: TState,
  levels: number
): (Wildcard<TState> | TState)[] {
  const parts = targetState.split(".");
  if (levels < 1 || levels > parts.length + 1) {
    throw new Error("Invalid number of levels");
  }

  const result: (Wildcard<TState> | TState)[] = [];
  if (levels > parts.length) {
    result.push("*");
  }

  for (let i = parts.length - levels + 1; i < parts.length; i++) {
    const slice = parts.slice(0, i);
    if (slice.length > 0) {
      result.push((slice.join(".") + ".*") as Wildcard<TState>);
    }
  }

  result.push(targetState);

  return result;
}

class SafeContext<TContext extends object> {
  #curr: Readonly<TContext>;

  constructor(initialContext: TContext) {
    this.#curr = initialContext;
  }

  get current(): Readonly<TContext> {
    return this.#curr;
  }

  /**
   * Call a callback function that allows patching of the context, by
   * calling `context.patch()`. Patching is only allowed for the duration
   * of this window.
   */
  allowPatching(callback: (context: Patchable<TContext>) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    let allowed = true;

    const patchableContext = {
      ...this.#curr,
      patch(patch: Partial<TContext>): void {
        if (allowed) {
          self.#curr = Object.assign({}, self.#curr, patch);

          // Also patch the temporary mutable context helper itself, in case
          // there are multiple calls in a succession that need
          for (const pair of Object.entries(patch)) {
            const [key, value] = pair as [
              keyof TContext,
              TContext[keyof TContext],
            ];
            if (key !== "patch") {
              (this as TContext)[key] = value;
            }
          }
        } else {
          throw new Error("Can no longer patch stale context");
        }
      },
    };
    callback(patchableContext);

    // If ever the patch function is called after this temporary window,
    // disallow it
    allowed = false;
    return;
  }
}

enum RunningState {
  NOT_STARTED_YET, // Machine can be set up during this phase
  STARTED,
  STOPPED,
}

let nextId = 1;

export class FSM<
  TContext extends object,
  TEvent extends BaseEvent,
  TState extends string,
> {
  public id: number;

  // Indicates whether this state machine is still being configured, has
  // started, or has terminated
  #runningState: RunningState;

  readonly #currentContext: SafeContext<TContext>;

  #states: Set<TState>;
  #currentStateOrNull: TState | null;

  #allowedTransitions: Map<
    TState,
    Map<TEvent["type"], TargetFn<TContext, TEvent, TState>>
  >;

  readonly #eventHub: {
    readonly didReceiveEvent: EventSource<TEvent | BuiltinEvent>;
    readonly willTransition: EventSource<{ from: TState; to: TState }>;
    readonly didIgnoreEvent: EventSource<TEvent | BuiltinEvent>;
    readonly willExitState: EventSource<TState>;
    readonly didEnterState: EventSource<TState>;
    readonly didExitState: EventSource<{
      state: StateOrGroupPattern<TState>;
      durationMs: number;
    }>;
  };

  public readonly events: {
    readonly didReceiveEvent: Observable<TEvent | BuiltinEvent>;
    readonly willTransition: Observable<{ from: TState; to: TState }>;
    readonly didIgnoreEvent: Observable<TEvent | BuiltinEvent>;
    readonly willExitState: Observable<TState>;
    readonly didEnterState: Observable<TState>;
    readonly didExitState: Observable<{
      state: StateOrGroupPattern<TState>;
      durationMs: number;
    }>;
  };

  //
  // The cleanup stack is a stack of (optional) callback functions that will
  // be run when exiting the current state. If a state (or state group) does
  // not have an exit handler, then the entry for that level may be
  // `undefined`, but there will be an explicit entry in the stack for it.
  //
  // This will always be true:
  //
  //   cleanupStack.length == currentState.split('.').length + 1
  //
  // Each stack level represents a different state "group".
  //
  // For example, if you are in a state named `foo.bar.qux`, then the stack
  // will contain the exit handler for `foo.bar.qux` (at the top), then
  // `foo.bar.*`, then `foo.*`, and finally, `*`.
  //
  #cleanupStack: (CleanupFn<TContext> | null)[];

  //
  // The entry times stack tracks when each state level was entered, using
  // performance.now() timestamps. This parallels the cleanup stack structure.
  //
  // For example, if you are in state `foo.bar.qux`, the stack contains:
  // [timestamp for *, timestamp for foo.*, timestamp for foo.bar.*, timestamp for foo.bar.qux]
  //
  #entryTimesStack: number[];

  #enterFns: Map<TState | Wildcard<TState>, EnterFn<TContext>>;

  // Used to provide better error messages
  #knownEventTypes: Set<string>;

  /**
   * Returns the initial state, which is defined by the first call made to
   * .addState().
   */
  get #initialState(): TState {
    // Return the first state ever defined as the initial state
    const result = this.#states.values()[Symbol.iterator]().next();
    if (result.done) {
      throw new Error("No states defined yet");
    } else {
      return result.value;
    }
  }

  public get currentState(): TState {
    if (this.#currentStateOrNull === null) {
      if (this.#runningState === RunningState.NOT_STARTED_YET) {
        throw new Error("Not started yet");
      } else {
        throw new Error("Already stopped");
      }
    }
    return this.#currentStateOrNull;
  }

  /**
   * Starts the machine by entering the initial state.
   */
  public start(): this {
    if (this.#runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("State machine has already started");
    }

    this.#runningState = RunningState.STARTED;
    this.#currentStateOrNull = this.#initialState;
    this.#enter(null);
    return this;
  }

  /**
   * Stops the state machine. Stopping the state machine will call exit
   * handlers for the current state, but not enter a new state.
   */
  public stop(): void {
    if (this.#runningState !== RunningState.STARTED) {
      throw new Error("Cannot stop a state machine that hasn't started yet");
    }
    this.#exit(null);
    this.#runningState = RunningState.STOPPED;
    this.#currentStateOrNull = null;
  }

  constructor(initialContext: Readonly<TContext>) {
    this.id = nextId++;
    this.#runningState = RunningState.NOT_STARTED_YET;
    this.#currentStateOrNull = null;
    this.#states = new Set();
    this.#enterFns = new Map();
    this.#cleanupStack = [];
    this.#entryTimesStack = [];
    this.#knownEventTypes = new Set();
    this.#allowedTransitions = new Map();
    this.#currentContext = new SafeContext(initialContext);
    this.#eventHub = {
      didReceiveEvent: makeEventSource(),
      willTransition: makeEventSource(),
      didIgnoreEvent: makeEventSource(),
      willExitState: makeEventSource(),
      didEnterState: makeEventSource(),
      didExitState: makeEventSource(),
    };
    this.events = {
      didReceiveEvent: this.#eventHub.didReceiveEvent.observable,
      willTransition: this.#eventHub.willTransition.observable,
      didIgnoreEvent: this.#eventHub.didIgnoreEvent.observable,
      willExitState: this.#eventHub.willExitState.observable,
      didEnterState: this.#eventHub.didEnterState.observable,
      didExitState: this.#eventHub.didExitState.observable,
    };
  }

  public get context(): Readonly<TContext> {
    return this.#currentContext.current;
  }

  /**
   * Define an explicit finite state in the state machine.
   */
  public addState(state: TState): this {
    if (this.#runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.#states.add(state);
    return this;
  }

  public onEnter(
    nameOrPattern: TState | Wildcard<TState>,
    enterFn: EnterFn<TContext>
  ): this {
    if (this.#runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    } else if (this.#enterFns.has(nameOrPattern)) {
      throw new Error(
        // TODO We _currently_ don't support multiple .onEnters() for the same
        // state, but this is not a fundamental limitation. Just not
        // implemented yet. If we wanted to, we could make this an array.
        `enter/exit function for ${nameOrPattern} already exists`
      );
    }

    this.#enterFns.set(nameOrPattern, enterFn);
    return this;
  }

  /**
   * Defines a promise-based state. When the state is entered, the promise is
   * created. When the promise resolves, the machine will transition to the
   * provided `onOK` target state. When the promise rejects, the machine will
   * transition to the `onError` target state.
   *
   * Optionally, a `maxTimeout` can be set. If the timeout happens before the
   * promise is settled, then the machine will also transition to the `onError`
   * target state.
   *
   * @param stateOrPattern  The state name, or state group pattern name.
   * @param promiseFn       The callback to be invoked when the state is entered.
   * @param onOK            The state to transition to when the promise resolves.
   * @param onError         The state to transition to when the promise
   *                        rejects, or when the timeout happens before the
   *                        promise has been settled.
   * @param maxTimeout      Optional timeout in milliseconds.
   *
   * When the promise callback function is invoked, it's provided with an
   * AbortSignal (2nd argument).
   * If a state transition happens while the promise is pending (for example,
   * an event, or a timeout happens), then an abort signal will be used to
   * indicate this. Implementers can use this abort signal to terminate the
   * in-flight promise, or ignore its results, etc.
   */
  public onEnterAsync<T>(
    nameOrPattern: TState | Wildcard<TState>,
    promiseFn: (context: Readonly<TContext>, signal: AbortSignal) => Promise<T>,
    onOK: Target<TContext, AsyncOKEvent<T>, TState>,
    onError: Target<TContext, AsyncErrorEvent, TState>,
    maxTimeout?: number
  ): this {
    return this.onEnter(nameOrPattern, () => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      const timeoutId = maxTimeout
        ? setTimeout(() => {
            const reason = new Error("Timed out");
            this.#transition({ type: "ASYNC_ERROR", reason }, onError);
          }, maxTimeout)
        : undefined;

      let done = false;
      void promiseFn(this.#currentContext.current, signal).then(
        // On OK
        (data: T) => {
          if (!signal.aborted) {
            done = true;
            this.#transition({ type: "ASYNC_OK", data }, onOK);
          }
        },

        // On Error
        (reason: unknown) => {
          if (!signal.aborted) {
            done = true;
            this.#transition({ type: "ASYNC_ERROR", reason }, onError);
          }
        }
      );

      return () => {
        clearTimeout(timeoutId);
        if (!done) {
          abortController.abort();
        }
      };
    });
  }

  #getStatesMatching(nameOrPattern: TState | Wildcard<TState>): TState[] {
    const matches: TState[] = [];

    // We're trying to match a group pattern here, i.e. `foo.*` (which might
    // match `foo.bar` and `foo.qux` states)
    if (nameOrPattern === "*") {
      for (const state of this.#states) {
        matches.push(state);
      }
    } else if (nameOrPattern.endsWith(".*")) {
      const prefix = nameOrPattern.slice(0, -1); // Strip only the "*", keep the "."
      for (const state of this.#states) {
        if (state.startsWith(prefix)) {
          matches.push(state);
        }
      }
    } else {
      // Just a single, explicit state name
      const name = nameOrPattern as TState;
      if (this.#states.has(name)) {
        matches.push(name);
      }
    }

    if (matches.length === 0) {
      throw new Error(`No states match ${JSON.stringify(nameOrPattern)}`);
    }

    return matches;
  }

  /**
   * Define all allowed outgoing transitions for a state.
   *
   * The targets for each event can be defined as a function which returns the
   * next state to transition to. These functions can look at the `event` or
   * `context` params to conditionally decide which next state to transition
   * to.
   *
   * If you set it to `null`, then the transition will be explicitly forbidden
   * and throw an error. If you don't define a target for a transition, then
   * such events will get ignored.
   */
  public addTransitions(
    nameOrPattern: TState | Wildcard<TState>,
    mapping: {
      [E in TEvent as E["type"]]?: Target<TContext, E, TState> | null;
    }
  ): this {
    if (this.#runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }

    for (const srcState of this.#getStatesMatching(nameOrPattern)) {
      let map = this.#allowedTransitions.get(srcState);
      if (map === undefined) {
        map = new Map();
        this.#allowedTransitions.set(srcState, map);
      }

      for (const [type, target_] of Object.entries(mapping)) {
        if (map.has(type)) {
          throw new Error(
            `Trying to set transition "${type}" on "${srcState}" (via "${nameOrPattern}"), but a transition already exists there.`
          );
        }

        const target = target_ as
          | Target<TContext, TEvent, TState>
          | null
          | undefined;
        this.#knownEventTypes.add(type);

        if (target !== undefined) {
          const targetFn = typeof target === "function" ? target : () => target;
          map.set(type, targetFn);
        }
      }
    }
    return this;
  }

  /**
   * Like `.addTransition()`, but takes an (anonymous) transition whenever the
   * timer fires.
   *
   * @param stateOrPattern  The state name, or state group pattern name.
   * @param after           Number of milliseconds after which to take the
   *                        transition. If in the mean time, another transition
   *                        is taken, the timer will get cancelled.
   * @param target          The target state to go to.
   */
  public addTimedTransition(
    stateOrPattern: TState | Wildcard<TState>,
    after: number | ((context: Readonly<TContext>) => number),
    target: Target<TContext, TimerEvent, TState>
  ): this {
    return this.onEnter(stateOrPattern, () => {
      const ms =
        typeof after === "function"
          ? after(this.#currentContext.current)
          : after;
      const timeoutID = setTimeout(() => {
        this.#transition({ type: "TIMER" }, target);
      }, ms);

      return () => {
        clearTimeout(timeoutID);
      };
    });
  }

  #getTargetFn(
    eventName: TEvent["type"]
  ): TargetFn<TContext, TEvent, TState> | undefined {
    return this.#allowedTransitions.get(this.currentState)?.get(eventName);
  }

  /**
   * Exits the current state, and executes any necessary cleanup functions.
   * Call this before changing the current state to the next state.
   *
   * @param levels Defines how many "levels" of nesting will be
   * exited. For example, if you transition from `foo.bar.qux` to
   * `foo.bar.baz`, then the level is 1. But if you transition from
   * `foo.bar.qux` to `bla.bla`, then the level is 3.
   * If `null`, it will exit all levels.
   */
  #exit(levels: number | null) {
    this.#eventHub.willExitState.notify(this.currentState);

    const now = performance.now();
    const parts = this.currentState.split(".");

    this.#currentContext.allowPatching((patchableContext) => {
      levels = levels ?? this.#cleanupStack.length;
      for (let i = 0; i < levels; i++) {
        this.#cleanupStack.pop()?.(patchableContext);

        // Emit timing info for the exited state level
        const entryTime = this.#entryTimesStack.pop();
        if (
          entryTime !== undefined &&
          // ...but avoid computing state names if nobody is listening
          this.#eventHub.didExitState.count() > 0
        ) {
          // Compute the state prefix for this level
          // Stack depth corresponds to: *, foo.*, foo.bar.*, foo.bar.baz
          // So current stack length after pop tells us which prefix we exited
          const depth = this.#entryTimesStack.length;

          // Skip the root wildcard level (depth === 0)
          if (depth === 0) continue;

          const state: StateOrGroupPattern<TState> =
            depth === parts.length
              ? this.currentState // Leaf state: use exact name
              : (`${parts.slice(0, depth).join(".")}.*` as `${Groups<TState>}.*`);
          this.#eventHub.didExitState.notify({
            state,
            durationMs: now - entryTime,
          });
        }
      }
    });
  }

  /**
   * Enters the current state, and executes any necessary onEnter handlers.
   * Call this directly _after_ setting the current state to the next state.
   */
  #enter(levels: number | null) {
    const enterPatterns = patterns(
      this.currentState,
      levels ?? this.currentState.split(".").length + 1
    );

    const now = performance.now();

    this.#currentContext.allowPatching((patchableContext) => {
      for (const pattern of enterPatterns) {
        const enterFn = this.#enterFns.get(pattern);
        const cleanupFn = enterFn?.(patchableContext);
        if (typeof cleanupFn === "function") {
          this.#cleanupStack.push(cleanupFn);
        } else {
          this.#cleanupStack.push(null);
        }
        // Track entry time for this state level
        this.#entryTimesStack.push(now);
      }
    });

    this.#eventHub.didEnterState.notify(this.currentState);
  }

  /**
   * Sends an event to the machine, which may cause an internal state
   * transition to happen. When that happens, will trigger side effects.
   */
  public send(event: TEvent): void {
    // Throw if the event is unknown, which may likely be a configuration error
    if (!this.#knownEventTypes.has(event.type)) {
      throw new Error(`Invalid event ${JSON.stringify(event.type)}`);
    }

    if (this.#runningState === RunningState.STOPPED) {
      // Ignore all events sent to the machine after it has stopped. This is
      // similar to how we ignore events sent to the machine after it
      // transitioned to a phase in which the event won't be handled: it would
      // also get ignored.
      // However, if the machine _hasn't started yet_, we still let it throw an
      // error, because then it's most likely a usage error.
      return;
    }

    const targetFn = this.#getTargetFn(event.type);
    if (targetFn !== undefined) {
      return this.#transition(event, targetFn);
    } else {
      // Ignore the event otherwise
      this.#eventHub.didIgnoreEvent.notify(event);
    }
  }

  #transition<E extends TEvent | BuiltinEvent>(
    event: E,
    target: Target<TContext, E, TState>
  ) {
    this.#eventHub.didReceiveEvent.notify(event);

    const oldState = this.currentState;

    const targetFn = typeof target === "function" ? target : () => target;
    const nextTarget = targetFn(event, this.#currentContext.current);
    let nextState: TState;
    let effects: Effect<TContext, E>[] | undefined = undefined;
    if (nextTarget === null) {
      // Do not transition
      this.#eventHub.didIgnoreEvent.notify(event);
      return;
    }

    if (typeof nextTarget === "string") {
      nextState = nextTarget;
    } else {
      nextState = nextTarget.target;
      effects = Array.isArray(nextTarget.effect)
        ? nextTarget.effect
        : [nextTarget.effect];
    }

    if (!this.#states.has(nextState)) {
      throw new Error(`Invalid next state name: ${JSON.stringify(nextState)}`);
    }

    this.#eventHub.willTransition.notify({ from: oldState, to: nextState });

    const [up, down] = distance(this.currentState, nextState);
    if (up > 0) {
      this.#exit(up);
    }

    this.#currentStateOrNull = nextState; // NOTE: Could stay the same, but... there could be an action to execute here
    if (effects !== undefined) {
      const effectsToRun = effects;
      this.#currentContext.allowPatching((patchableContext) => {
        for (const effect of effectsToRun) {
          if (typeof effect === "function") {
            // May mutate context
            effect(patchableContext, event);
          } else {
            patchableContext.patch(effect);
          }
        }
      });
    }

    if (down > 0) {
      this.#enter(down);
    }
  }
}

/** @internal - For unit tests only */
export { distance, patterns };
