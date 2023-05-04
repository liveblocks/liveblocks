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

enum RunningState {
  NOT_STARTED_YET, // Machine can be set up during this phase
  STARTED,
  STOPPED,
}

type Action<
  TContext,
  TEvent extends BaseEvent,
  TState extends BaseState<TContext>
> = (event: TEvent, context: Readonly<TContext>) => TState["name"];

type Groups<T extends string> = T extends `${infer G}.${string}` ? G : never;
type Wildcardify<T extends string> = Resolve<T | "*" | `${Groups<T>}.*`>;

export class FiniteStateMachine<
  TContext,
  TEvent extends BaseEvent,
  TState extends BaseState<TContext>
> {
  // Indicates whether this state machine is still being configured, has
  // started, or has terminated
  private runningState: RunningState;

  private context: TContext;
  private states: Map<string, TState>;
  private allowedTransitions: Map<
    string,
    Map<string, Action<TContext, TEvent, TState>>
  >;
  private currentStateOrNull: TState | null;
  private cleanupFn: (() => void) | undefined;

  // Used to provide better error messages
  private knownEvents: Set<string>;

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

  private get currentState(): TState {
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
    this.knownEvents = new Set();
    this.allowedTransitions = new Map();
    this.context = initialContext;
  }

  /**
   * Declares the existence of an event type.
   *
   * XXX Not sure if this method will eventually be needed.
   */
  public addEvent(eventType: TEvent["type"]): this {
    if (this.runningState !== RunningState.NOT_STARTED_YET) {
      throw new Error("Already started");
    }
    this.knownEvents.add(eventType);
    return this;
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
    this.states.set(state.name, state);
    return this;
  }

  public addTransitions(
    src: Wildcardify<TState["name"]>,
    mapping: {
      //
      // NOTE: I'm exploring the idea of making it super explicit, by letting
      // TypeScript force you to handle each event explicitly from every
      // possible state, so that you make a very explicit decision in each
      // scenario. If that is ultimately too annoying, we can make these
      // explicit `null`s optional instead.
      //
      // Alternatively, we could distinguish `undefined` as "ignore", and
      // `null` as throw-and-explicitly-forbid the transition.
      //
      [E in TEvent as E["type"]]?: Action<TContext, E, TState> | null;
      //                        ^ Add a `?` here if too annoying
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
        if (ev !== null && ev !== undefined) {
          // XXX Disallow overwriting when using a wildcard pattern!
          map.set(type, ev as Action<TContext, TEvent, TState>);
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
  ): Action<TContext, TEvent, TState> | undefined {
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
      if (this.knownEvents.has(event.type)) {
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
