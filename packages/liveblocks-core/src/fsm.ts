/**
 * Finite State Machine (FSM) implementation.
 */
import type { Resolve } from "./lib/Resolve";

// XXX Tidy up this class before publishing

type BaseEvent = { type: string };

enum RunningState {
  NOT_STARTED_YET, // Machine can be set up during this phase
  STARTED,
  STOPPED,
}

type CleanupFn = () => void;
type EnterFn<TContext> = (context: TContext) => void | CleanupFn;
type ExitFn<TContext> = (context: TContext) => void;

type TargetFn<TContext, TEvent extends BaseEvent, TState extends string> = (
  event: TEvent,
  context: Readonly<TContext>
) => TState;

type Groups<T extends string> = T extends `${infer G}.${string}` ? G : never;
type Wildcardify<T extends string> = T | "*" | `${Groups<T>}.*`;

export class FiniteStateMachine<
  TContext,
  TEvent extends BaseEvent,
  TState extends string
> {
  // Indicates whether this state machine is still being configured, has
  // started, or has terminated
  private runningState: RunningState;

  private context: TContext;

  private states: Set<TState>;
  private currentStateOrNull: TState | null;

  private allowedTransitions: Map<
    string,
    Map<string, TargetFn<TContext, TEvent, TState>>
  >;

  // TODO: Generalize this data structure to support group-based
  // exiting/entering, more like a stack
  private cleanupFn: (() => void) | undefined;
  private enterFns: Map<TState, EnterFn<TContext>>;
  private exitFns: Map<TState, ExitFn<TContext>>;

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
    this.enter();
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
    this.exit();
    this.currentStateOrNull = null;
  }

  constructor(initialContext: TContext) {
    this.runningState = RunningState.NOT_STARTED_YET;
    this.currentStateOrNull = null;
    this.states = new Set();
    this.enterFns = new Map();
    this.exitFns = new Map();
    this.knownEventTypes = new Set();
    this.allowedTransitions = new Map();
    this.context = initialContext;
  }

  /**
   * Define an explicit finite state in the state machine. States can contain
   * onEnter and onExit handlers which will automatically get triggered when
   * state transitions around this state happen.
   */
  public addState(state: TState): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.states.add(state);
    return this;
  }

  public onEnter(state: TState, enterFn: EnterFn<TContext>): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.enterFns.set(state, enterFn);
    return this;
  }

  public onExit(state: TState, exitFn: (context: TContext) => void): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.exitFns.set(state, exitFn);
    return this;
  }

  private getMatches(nameOrPattern: Resolve<Wildcardify<TState>>): TState[] {
    const matches: TState[] = [];

    // We're trying to match a group pattern here, i.e. `foo.*` (which might
    // match `foo.bar` and `foo.qux` states)
    if (nameOrPattern.endsWith("*")) {
      const prefix = nameOrPattern.slice(0, -1);
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
   * WARNING: The target functions should be used to trigger any side effects!
   * XXX Use explicit transition actions for that.
   *
   * If you set it to `null`, then the transition will be explicitly forbidden
   * and throw an error. If you don't define a target for a transition, then
   * such events will get ignored.
   */
  public addTransitions(
    nameOrPattern: Resolve<Wildcardify<TState>>,
    mapping: {
      [E in TEvent as E["type"]]?: TargetFn<TContext, E, TState> | null;
    }
  ): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }

    for (const src of this.getMatches(nameOrPattern)) {
      let map = this.allowedTransitions.get(src);
      if (map === undefined) {
        map = new Map();
        this.allowedTransitions.set(src, map);
      }

      for (const [type, targetFn] of Object.entries(mapping)) {
        this.knownEventTypes.add(type);

        if (targetFn !== undefined && targetFn !== null) {
          // TODO Disallow overwriting when using a wildcard pattern!
          map.set(type, targetFn as TargetFn<TContext, TEvent, TState>);
        }
      }
    }
    return this;
  }

  private getTransition(
    eventName: TEvent["type"]
  ): TargetFn<TContext, TEvent, TState> | undefined {
    return this.allowedTransitions.get(this.currentState)?.get(eventName);
  }

  /**
   * Checks to see if the given event can be handled in the current state.
   *
   * XXX Not sure if this method will eventually be needed.
   */
  public can(eventName: TEvent["type"]): boolean {
    return this.getTransition(eventName) !== undefined;
  }

  /**
   * Exits the current state, and executes any necessary onExit handlers.
   * Call this before changing the current state to the next state.
   */
  private exit() {
    this.cleanupFn?.();
    this.cleanupFn = undefined;
    this.exitFns.get(this.currentState)?.(this.context);
  }

  /**
   * Enters the current state, and executes any necessary onEnter handlers.
   * Call this directly _after_ setting the current state to the next state.
   */
  private enter() {
    const cleanupFn = this.enterFns.get(this.currentState)?.(this.context);
    if (typeof cleanupFn === "function") {
      this.cleanupFn = cleanupFn;
    }
  }

  /**
   * Sends an event to the machine, which may cause an internal state
   * transition to happen. When that happens, will trigger side effects.
   */
  public transition(event: TEvent): void {
    const action = this.getTransition(event.type);
    if (action === undefined) {
      if (this.knownEventTypes.has(event.type)) {
        // XXX Fail silently instead?
        throw new Error(
          `Event ${JSON.stringify(
            event.type
          )} is not allowed from state ${JSON.stringify(this.currentState)}`
        );
      } else {
        throw new Error(`Unknown event ${JSON.stringify(event.type)}`);
      }
    }

    const nextState = action(event, this.context);
    if (!this.states.has(nextState)) {
      throw new Error(`Invalid next state name: ${JSON.stringify(nextState)}`);
    }

    // TODO: Generalize this check to support group-based exiting/entering
    if (nextState !== this.currentState) {
      this.exit();
      this.currentStateOrNull = nextState;
      this.enter();
    }
  }

  /**
   * Like .transition(), but will not throw if the event cannot be handled by
   * the current state.
   *
   * XXX Not sure if this method will eventually be needed.
   */
  public transitionIfPossible(event: TEvent) {
    if (this.can(event.type)) {
      this.transition(event);
    }
  }
}
