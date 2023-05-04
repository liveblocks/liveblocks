/**
 * Finite State Machine (FSM) implementation.
 */
import type { Resolve } from "./lib/Resolve";

// XXX Tidy up this class before publishing

// Trick taken from the React codebase
type CleanupFn = () => void;

type BaseState<TContext> = {
  name: string;
  onEnter?: (context: TContext) => void | CleanupFn;
  onExit?: (context: TContext) => void;
};
type BaseEvent = { type: string };

type State<TStateName extends string, TContext> = {
  name: TStateName;
  onEnter?: (context: TContext) => void | CleanupFn;
  onExit?: (context: TContext) => void;
};

enum RunningState {
  NOT_STARTED_YET, // Machine can be set up during this phase
  STARTED,
  STOPPED,
}

type TargetFn<
  TContext,
  TEvent extends BaseEvent,
  TState extends BaseState<TContext>
> = (event: TEvent, context: Readonly<TContext>) => TState["name"];

type Groups<T extends string> = T extends `${infer G}.${string}` ? G : never;
type Wildcardify<T extends string> = T | "*" | `${Groups<T>}.*`;

export class FiniteStateMachine<
  TContext,
  TEvent extends BaseEvent,
  TStateName extends string // BaseState<TContext>
> {
  // Indicates whether this state machine is still being configured, has
  // started, or has terminated
  private runningState: RunningState;

  private context: TContext;
  private states: Map<string, State<TStateName, TContext>>;
  private allowedTransitions: Map<
    string,
    Map<string, TargetFn<TContext, TEvent, State<TStateName, TContext>>>
  >;
  private currentStateOrNull: State<TStateName, TContext> | null;
  private cleanupFn: (() => void) | undefined;

  // Used to provide better error messages
  private knownEventTypes: Set<string>;

  /**
   * Returns the initial state, which is defined by the first call made to
   * .addState().
   */
  private get initialState(): State<TStateName, TContext> {
    // Return the first state ever defined as the initial state
    const result = this.states.values()[Symbol.iterator]().next();
    if (result.done) {
      throw new Error("No states defined yet");
    } else {
      return result.value;
    }
  }

  private get currentState(): State<TStateName, TContext> {
    if (this.currentStateOrNull === null) {
      throw new Error("State machine is not configured yet");
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
    this.states = new Map();
    this.knownEventTypes = new Set();
    this.allowedTransitions = new Map();
    this.context = initialContext;
  }

  /**
   * Define an explicit finite state in the state machine. States can contain
   * onEnter and onExit handlers which will automatically get triggered when
   * state transitions around this state happen.
   */
  public addState(state: State<TStateName, TContext>): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.states.set(state.name, state);
    return this;
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
    src: Resolve<Wildcardify<TStateName>>,
    mapping: {
      [E in TEvent as E["type"]]?: TargetFn<
        TContext,
        E,
        State<TStateName, TContext>
      > | null;
    }
  ): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }

    const srcStateNames = src.endsWith("*")
      ? Array.from(this.states.keys()).filter((name) =>
          name.startsWith(src.slice(0, -1))
        )
      : [src];

    for (const srcStateName of srcStateNames) {
      let map = this.allowedTransitions.get(srcStateName);
      if (map === undefined) {
        map = new Map();
        this.allowedTransitions.set(srcStateName, map);
      }

      for (const [type, ev] of Object.entries(mapping)) {
        this.knownEventTypes.add(type);

        if (ev !== undefined && ev !== null) {
          // TODO Disallow overwriting when using a wildcard pattern!
          map.set(
            type,
            ev as TargetFn<TContext, TEvent, State<TStateName, TContext>>
          );
        }
      }
    }
    return this;
  }

  public get currentStateName(): string {
    if (this.runningState === RunningState.NOT_STARTED_YET) {
      throw new Error("Machine hasn't started yet");
    }
    if (this.runningState === RunningState.STOPPED) {
      throw new Error("Machine already stopped");
    }
    return this.currentState.name;
  }

  private getTransition(
    eventName: TEvent["type"]
  ): TargetFn<TContext, TEvent, State<TStateName, TContext>> | undefined {
    return this.allowedTransitions.get(this.currentStateName)?.get(eventName);
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
    this.currentState.onExit?.(this.context);
  }

  /**
   * Enters the current state, and executes any necessary onEnter handlers.
   * Call this directly _after_ setting the current state to the next state.
   */
  private enter() {
    const cleanupFn = this.currentState.onEnter?.(this.context);
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
          )} is not allowed from state ${JSON.stringify(
            this.currentState.name
          )}`
        );
      } else {
        throw new Error(`Unknown event ${JSON.stringify(event.type)}`);
      }
    }

    const nextStateName = action(event, this.context);
    const nextState = this.states.get(nextStateName);
    if (nextState === undefined) {
      throw new Error(
        `Invalid next state name: ${JSON.stringify(nextStateName)}`
      );
    }

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
