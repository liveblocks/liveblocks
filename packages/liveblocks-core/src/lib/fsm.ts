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

export type CleanupFn = () => void;
export type EnterFn<TContext> = (
  context: Readonly<TContext>
) => void | CleanupFn;

export type TargetFn<
  TContext,
  TEvent extends BaseEvent,
  TState extends string
> = (
  event: TEvent,
  context: Readonly<TContext>
) => TState | TargetConfig<TContext, TEvent, TState> | null;

export type Assigner<TContext, TEvent extends BaseEvent> =
  | Partial<TContext>
  | ((context: Readonly<TContext>, event: TEvent) => Partial<TContext>);

export type Effect<TContext, TEvent extends BaseEvent> = (
  context: Readonly<TContext>,
  event: TEvent
) => void;

export type TargetConfig<
  TContext,
  TEvent extends BaseEvent,
  TState extends string
> = {
  target: TState;

  /**
   * Specify an object that will be used to "patch" the current context as soon
   * as the transition is taken. The context will be updated before the new
   * state is entered.
   */
  assign?: Assigner<TContext, TEvent>;

  /**
   * Emit a side effect (other than assigning to the context) when this
   * transition is taken.
   */
  effect?: Effect<TContext, TEvent>;
};

export type Target<TContext, TEvent extends BaseEvent, TState extends string> =
  | TState // Static, e.g. 'complete'
  | TargetConfig<TContext, TEvent, TState>
  | TargetFn<TContext, TEvent, TState>; // Dynamic, e.g. (context) => context.x ? 'complete' : 'other'

type Groups<T extends string> = T extends `${infer G}.${infer Rest}`
  ? G | `${G}.${Groups<Rest>}`
  : never;
export type Wildcard<T extends string> = "*" | `${Groups<T>}.*`;

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

enum RunningState {
  NOT_STARTED_YET, // Machine can be set up during this phase
  STARTED,
  STOPPED,
}

let nextId = 1;

export class FSM<
  TContext extends object,
  TEvent extends BaseEvent,
  TState extends string
> {
  public id: number;

  // Indicates whether this state machine is still being configured, has
  // started, or has terminated
  private runningState: RunningState;

  private currentContext: Readonly<TContext>;

  private states: Set<TState>;
  private currentStateOrNull: TState | null;

  private allowedTransitions: Map<
    TState,
    Map<TEvent["type"], TargetFn<TContext, TEvent, TState>>
  >;

  private readonly eventHub: {
    readonly didReceiveEvent: EventSource<TEvent | BuiltinEvent>;
    readonly willTransition: EventSource<{ from: TState; to: TState }>;
    readonly didPatchContext: EventSource<Partial<TContext>>;
    readonly didIgnoreEvent: EventSource<TEvent | BuiltinEvent>;
    readonly willExitState: EventSource<TState>;
    readonly didEnterState: EventSource<TState>;
  };

  public readonly events: {
    readonly didReceiveEvent: Observable<TEvent | BuiltinEvent>;
    readonly willTransition: Observable<{ from: TState; to: TState }>;
    readonly didPatchContext: Observable<Partial<TContext>>;
    readonly didIgnoreEvent: Observable<TEvent | BuiltinEvent>;
    readonly willExitState: Observable<TState>;
    readonly didEnterState: Observable<TState>;
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
  private cleanupStack: (CleanupFn | null)[];

  private enterFns: Map<TState | Wildcard<TState>, EnterFn<TContext>>;

  // Used to provide better error messages
  private knownEventTypes: Set<string>;

  /**
   * Returns the initial state, which is defined by the first call made to
   * .addState().
   */
  private get initialState(): TState {
    // Return the first state ever defined as the initial state
    const result = this.states.values()[Symbol.iterator]().next();
    if (result.done) {
      throw new Error("No states defined yet");
    } else {
      return result.value;
    }
  }

  public get currentState(): TState {
    if (this.currentStateOrNull === null) {
      throw new Error("Not started yet");
    }
    return this.currentStateOrNull;
  }

  /**
   * Starts the machine by entering the initial state.
   */
  public start(): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("State machine has already started");
    }

    this.runningState = RunningState.STARTED;
    this.currentStateOrNull = this.initialState;
    this.enter(null);
    return this;
  }

  /**
   * Stops the state machine. Stopping the state machine will call exit
   * handlers for the current state, but not enter a new state.
   */
  public stop(): void {
    if (this.runningState !== RunningState.STARTED) {
      throw new Error("Cannot stop a state machine that isn't started yet");
    }
    this.runningState = RunningState.STOPPED;
    this.exit(null);
    this.currentStateOrNull = null;
  }

  constructor(initialContext: Readonly<TContext>) {
    this.id = nextId++;
    this.runningState = RunningState.NOT_STARTED_YET;
    this.currentStateOrNull = null;
    this.states = new Set();
    this.enterFns = new Map();
    this.cleanupStack = [];
    this.knownEventTypes = new Set();
    this.allowedTransitions = new Map();
    this.currentContext = Object.assign({}, initialContext);
    this.eventHub = {
      didReceiveEvent: makeEventSource(),
      willTransition: makeEventSource(),
      didPatchContext: makeEventSource(),
      didIgnoreEvent: makeEventSource(),
      willExitState: makeEventSource(),
      didEnterState: makeEventSource(),
    };
    this.events = {
      didReceiveEvent: this.eventHub.didReceiveEvent.observable,
      willTransition: this.eventHub.willTransition.observable,
      didPatchContext: this.eventHub.didPatchContext.observable,
      didIgnoreEvent: this.eventHub.didIgnoreEvent.observable,
      willExitState: this.eventHub.willExitState.observable,
      didEnterState: this.eventHub.didEnterState.observable,
    };
  }

  public get context(): Readonly<TContext> {
    return this.currentContext;
  }

  /**
   * Define an explicit finite state in the state machine.
   */
  public addState(state: TState): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.states.add(state);
    return this;
  }

  public onEnter(
    nameOrPattern: TState | Wildcard<TState>,
    enterFn: EnterFn<TContext>
  ): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    } else if (this.enterFns.has(nameOrPattern)) {
      throw new Error(
        // TODO We _currently_ don't support multiple .onEnters() for the same
        // state, but this is not a fundamental limitation. Just not
        // implemented yet. If we wanted to, we could make this an array.
        `enter/exit function for ${nameOrPattern} already exists`
      );
    }

    this.enterFns.set(nameOrPattern, enterFn);
    return this;
  }

  public onEnterAsync<T>(
    nameOrPattern: TState | Wildcard<TState>,
    promiseFn: (context: Readonly<TContext>) => Promise<T>,
    onOK: Target<TContext, AsyncOKEvent<T>, TState>,
    onError: Target<TContext, AsyncErrorEvent, TState>
  ): this {
    return this.onEnter(nameOrPattern, () => {
      let cancelled = false;

      void promiseFn(this.currentContext).then(
        // On OK
        (data: T) => {
          if (!cancelled) {
            this.transition({ type: "ASYNC_OK", data }, onOK);
          }
        },

        // On Error
        (reason: unknown) => {
          if (!cancelled) {
            this.transition({ type: "ASYNC_ERROR", reason }, onError);
          }
        }
      );

      return () => {
        cancelled = true;
      };
    });
  }

  private getStatesMatching(
    nameOrPattern: TState | Wildcard<TState>
  ): TState[] {
    const matches: TState[] = [];

    // We're trying to match a group pattern here, i.e. `foo.*` (which might
    // match `foo.bar` and `foo.qux` states)
    if (nameOrPattern === "*") {
      for (const state of this.states) {
        matches.push(state);
      }
    } else if (nameOrPattern.endsWith(".*")) {
      const prefix = nameOrPattern.slice(0, -1); // Strip only the "*", keep the "."
      for (const state of this.states) {
        if (state.startsWith(prefix)) {
          matches.push(state);
        }
      }
    } else {
      // Just a single, explicit state name
      const name = nameOrPattern as TState;
      if (this.states.has(name)) {
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
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }

    for (const srcState of this.getStatesMatching(nameOrPattern)) {
      let map = this.allowedTransitions.get(srcState);
      if (map === undefined) {
        map = new Map();
        this.allowedTransitions.set(srcState, map);
      }

      for (const [type, targetConfig_] of Object.entries(mapping)) {
        const targetConfig = targetConfig_ as
          | Target<TContext, TEvent, TState>
          | null
          | undefined;
        this.knownEventTypes.add(type);

        if (targetConfig !== undefined && targetConfig !== null) {
          // TODO Disallow overwriting when using a wildcard pattern!
          const targetFn =
            typeof targetConfig === "function"
              ? targetConfig
              : () => targetConfig;
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
   * @param stateOrPattern The state name, or state group pattern name.
   * @param after          Number of milliseconds after which to take the
   *                       transition. If in the mean time, another transition
   *                       is taken, the timer will get cancelled.
   * @param target     The target state to go to.
   */
  public addTimedTransition(
    stateOrPattern: TState | Wildcard<TState>,
    after: number | ((context: Readonly<TContext>) => number),
    target: Target<TContext, TimerEvent, TState>
  ): this {
    return this.onEnter(stateOrPattern, () => {
      const ms =
        typeof after === "function" ? after(this.currentContext) : after;
      const timeoutID = setTimeout(() => {
        this.transition({ type: "TIMER" }, target);
      }, ms);

      return () => {
        clearTimeout(timeoutID);
      };
    });
  }

  private getTargetFn(
    eventName: TEvent["type"]
  ): TargetFn<TContext, TEvent, TState> | undefined {
    return this.allowedTransitions.get(this.currentState)?.get(eventName);
  }

  /**
   * Exits the current state, and executes any necessary cleanup functions.
   * Call this before changing the current state to the next state.
   *
   * @param levels Defines how many "levels" of nesting will be exited. For
   * example, if you transition from `foo.bar.qux` to `foo.bar.baz`, then
   * the level is 1. But if you transition from `foo.bar.qux` to `bla.bla`,
   * then the level is 3.
   */
  private exit(levels: number | null) {
    this.eventHub.willExitState.notify(this.currentState);

    levels = levels ?? this.cleanupStack.length;
    for (let i = 0; i < levels; i++) {
      this.cleanupStack.pop()?.();
    }
  }

  /**
   * Enters the current state, and executes any necessary onEnter handlers.
   * Call this directly _after_ setting the current state to the next state.
   */
  private enter(levels: number | null) {
    const enterPatterns = patterns(
      this.currentState,
      levels ?? this.currentState.split(".").length + 1
    );

    for (const pattern of enterPatterns) {
      const enterFn = this.enterFns.get(pattern);
      const cleanupFn = enterFn?.(this.currentContext);
      if (typeof cleanupFn === "function") {
        this.cleanupStack.push(cleanupFn);
      } else {
        this.cleanupStack.push(null);
      }
    }

    this.eventHub.didEnterState.notify(this.currentState);
  }

  /**
   * Sends an event to the machine, which may cause an internal state
   * transition to happen. When that happens, will trigger side effects.
   */
  public send(event: TEvent): void {
    const targetFn = this.getTargetFn(event.type);
    if (targetFn !== undefined) {
      return this.transition(event, targetFn);
    }

    // Ignore the event otherwise, but throw if the event is entirely unknown,
    // which may likely be a configuration error
    if (!this.knownEventTypes.has(event.type)) {
      throw new Error(`Invalid event ${JSON.stringify(event.type)}`);
    } else {
      this.eventHub.didIgnoreEvent.notify(event);
    }
  }

  private transition<E extends TEvent | BuiltinEvent>(
    event: E,
    target: Target<TContext, E, TState>
  ) {
    this.eventHub.didReceiveEvent.notify(event);

    const oldState = this.currentState;

    const targetFn = typeof target === "function" ? target : () => target;
    const nextTarget = targetFn(event, this.currentContext);
    let nextState: TState;
    let assign: Assigner<TContext, E> | undefined = undefined;
    let effect: Effect<TContext, E> | undefined = undefined;
    if (nextTarget === null) {
      // Do not transition
      this.eventHub.didIgnoreEvent.notify(event);
      return;
    }

    if (typeof nextTarget === "string") {
      nextState = nextTarget;
    } else {
      nextState = nextTarget.target;
      assign = nextTarget.assign;
      effect = nextTarget.effect;
    }

    if (!this.states.has(nextState)) {
      throw new Error(`Invalid next state name: ${JSON.stringify(nextState)}`);
    }

    this.eventHub.willTransition.notify({ from: oldState, to: nextState });

    const [up, down] = distance(this.currentState, nextState);
    if (up > 0) {
      this.exit(up);
    }

    this.currentStateOrNull = nextState; // NOTE: Could stay the same, but... there could be an action to execute here
    if (assign !== undefined) {
      const patch =
        typeof assign === "function" ? assign(this.context, event) : assign;
      this.currentContext = Object.assign({}, this.currentContext, patch);
      this.eventHub.didPatchContext.notify(patch);
    }
    if (effect !== undefined) {
      effect(this.context, event);
    }

    if (down > 0) {
      this.enter(down);
    }
  }
}

/** @internal - For unit tests only */
export { distance, patterns };
