import { assertNever } from "./lib/assert";
import type { Observable } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import * as console from "./lib/fancy-console";
import type { BuiltinEvent, Patchable, Target } from "./lib/fsm";
import { FSM } from "./lib/fsm";
import type { Json } from "./lib/Json";
import { withTimeout } from "./lib/utils";
import type {
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";

/**
 * Old connection statuses, here for backward-compatibility reasons only.
 */
export type LegacyConnectionStatus =
  | "closed" // Room hasn't been entered, or has left already
  | "authenticating" // This state is no longer used, but older versions of the Liveblocks client still use it
  | "connecting" // In the process of authenticating and establishing a WebSocket connection
  | "open" // Successful room connection, on the happy path
  | "unavailable" // Connection lost unexpectedly, considered a temporary hiccup, will retry
  | "failed"; // Connection failed and we won't retry automatically (e.g. unauthorized)

/**
 * Returns a human-readable status indicating the current connection status of
 * a Room, as returned by `room.getStatus()`. Can be used to implement
 * a connection status badge.
 */
export type Status =
  | "initial"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

/**
 * Used to report about app-level reconnection issues.
 *
 * Normal (quick) reconnects won't be reported as a "lost connection". Instead,
 * the application will only get an event if the reconnection attempts by the
 * client are taking (much) longer than usual. Definitely a situation you want
 * to inform your users about, for example, by throwing a toast message on
 * screen, or show a "trying to reconnect" banner.
 */
export type LostConnectionEvent =
  | "lost" // the client is trying to reconnect to Liveblocks, but it's taking (much) longer than usual
  | "restored" // the client did reconnect after all
  | "failed"; // the client was told to stop trying

export function newToLegacyStatus(status: Status): LegacyConnectionStatus {
  switch (status) {
    case "connecting":
      return "connecting";

    case "connected":
      return "open";

    case "reconnecting":
      return "unavailable";

    case "disconnected":
      return "failed";

    case "initial":
      return "closed";

    // istanbul ignore next
    default:
      return "closed";
  }
}

/**
 * Maps internal machine state to the public Status API.
 */
function toNewConnectionStatus(machine: FSM<Context, Event, State>): Status {
  const state = machine.currentState;
  switch (state) {
    case "@ok.connected":
    case "@ok.awaiting-pong":
      return "connected";

    case "@idle.initial":
      return "initial";

    case "@auth.busy":
    case "@auth.backoff":
    case "@connecting.busy":
    case "@connecting.backoff":
      return machine.context.successCount > 0 ? "reconnecting" : "connecting";

    case "@idle.failed":
      return "disconnected";

    // istanbul ignore next
    default:
      return assertNever(state, "Unknown state");
  }
}

/**
 * Events that can be sent to the machine externally.
 */
type Event =
  // Public events that can be called on the connection manager
  | { type: "CONNECT" } // e.g. when trying to enter a room
  | { type: "RECONNECT" } // e.g. user asking for an explicit reconnect of the socket
  | { type: "DISCONNECT" } // e.g. leaving the room
  | { type: "WINDOW_GOT_FOCUS" } // e.g. user's browser tab is refocused
  | { type: "NAVIGATOR_ONLINE" } // e.g. browser gets back online
  | { type: "NAVIGATOR_OFFLINE" } // e.g. browser goes offline

  // Events that the connection manager will internally deal with
  | { type: "PONG" }
  | { type: "EXPLICIT_SOCKET_ERROR"; event: IWebSocketEvent }
  | { type: "EXPLICIT_SOCKET_CLOSE"; event: IWebSocketCloseEvent }

  // Only used by the E2E testing app, to simulate a pong timeout :(
  | { type: "PONG_TIMEOUT" };

type State =
  | "@idle.initial"
  | "@idle.failed"
  | "@auth.busy"
  | "@auth.backoff"
  | "@connecting.busy"
  | "@connecting.backoff"
  | "@ok.connected"
  | "@ok.awaiting-pong";

/**
 * Arbitrary record that will be used as the authentication "authValue". It's the
 * value that is returned by calling the authentication delegate, and will get
 * passed to the connection factory delegate. This value will be remembered by
 * the connection manager, but its value will not be interpreted, so it can be
 * any value (except null).
 */
export type BaseAuthResult = NonNullable<Json>;

type Context = {
  /**
   * Count the number of times the machine reaches an "@ok.*" state. Once the
   * machine reaches idle state again, this count is reset to 0 again.
   *
   * This lets us distinguish:
   * - If successCount = 0, then it's an initial "connecting" state.
   * - If successCount > 0, then it's an "reconnecting" state.
   */
  successCount: number;

  /**
   * Will be populated with the last known auth authValue.
   */
  authValue: BaseAuthResult | null;

  /**
   * The current active WebSocket connection to the room. If this is not null
   * on the context, then the socket has successfully been opened.
   */
  socket: IWebSocketInstance | null;

  /**
   * The current retry delay when automatically retrying. Will get bumped to
   * the next "tier" every time a connection attempt fails. Reset every time
   * a connection succeeded.
   */
  backoffDelay: number;
};

const BACKOFF_DELAYS = [250, 500, 1000, 2000, 4000, 8000, 10000] as const;

// Resetting the delay happens upon success. We could reset to 0, but that
// would risk no delay, which generally isn't wise. Instead, we'll reset it to
// the lowest safe delay minus 1 millisecond. The reason is that every time
// a retry happens, the retry delay will first be bumped to the next "tier".
const RESET_DELAY = BACKOFF_DELAYS[0] - 1;

/**
 * Used to back off from WebSocket reconnection attempts after a known
 * Liveblocks issue, like "room full" or a "rate limit" error.
 */
const BACKOFF_DELAYS_SLOW = [2000, 30000, 60000, 300000] as const;

/**
 * The client will send a PING to the server every 30 seconds, after which it
 * must receive a PONG back within the next 2 seconds. If that doesn't happen,
 * this is interpreted as an implicit connection loss event.
 */
const HEARTBEAT_INTERVAL = 30000;
const PONG_TIMEOUT = 2000;

/**
 * Maximum amount of time that the authentication delegate take to return an
 * auth authValue, or else we consider authentication timed out.
 */
const AUTH_TIMEOUT = 10000;

/**
 * Maximum amount of time that the socket connect delegate may take to return
 * an opened WebSocket connection, or else we consider the attempt timed out.
 */
const SOCKET_CONNECT_TIMEOUT = 10000;

/**
 * Special error class that can be thrown during authentication to stop the
 * connection manager from retrying.
 */
export class StopRetrying extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

class LiveblocksError extends Error {
  constructor(message: string, public code: number) {
    super(message);
  }
}

function nextBackoffDelay(
  currentDelay: number,
  delays: readonly number[] = BACKOFF_DELAYS
): number {
  return (
    delays.find((delay) => delay > currentDelay) ?? delays[delays.length - 1]
  );
}

function increaseBackoffDelay(context: Patchable<Context>) {
  context.patch({ backoffDelay: nextBackoffDelay(context.backoffDelay) });
}

function increaseBackoffDelayAggressively(context: Patchable<Context>) {
  context.patch({
    backoffDelay: nextBackoffDelay(context.backoffDelay, BACKOFF_DELAYS_SLOW),
  });
}

function resetSuccessCount(context: Patchable<Context>) {
  context.patch({ successCount: 0 });
}

enum LogLevel {
  INFO,
  WARN,
  ERROR,
}

/**
 * Generic "log" effect. Use it in `effect` handlers of state transitions.
 */
function log(level: LogLevel, message: string) {
  const logger =
    level === LogLevel.ERROR
      ? console.error
      : level === LogLevel.WARN
      ? console.warn
      : /* black hole */ () => {};
  return () => {
    logger(message);
  };
}

function logPrematureErrorOrCloseEvent(e: IWebSocketEvent | Error) {
  // Produce a useful log message
  const conn = "Connection to Liveblocks websocket server";
  return (ctx: Readonly<Context>) => {
    if (e instanceof Error) {
      console.warn(`${conn} could not be established. ${String(e)}`);
    } else {
      console.warn(
        isCloseEvent(e)
          ? `${conn} closed prematurely (code: ${e.code}). Retrying in ${ctx.backoffDelay}ms.`
          : `${conn} could not be established.`
      );
    }
  };
}

function logCloseEvent(event: IWebSocketCloseEvent) {
  return (ctx: Readonly<Context>) => {
    console.warn(
      `Connection to Liveblocks websocket server closed (code: ${event.code}). Retrying in ${ctx.backoffDelay}ms.`
    );
  };
}

const logPermanentClose = log(
  LogLevel.WARN,
  "Connection to WebSocket closed permanently. Won't retry."
);

function isCloseEvent(
  error: IWebSocketEvent | Error
): error is IWebSocketCloseEvent {
  return !(error instanceof Error) && error.type === "close";
}

/**
 * Whether this is a Liveblocks-specific close event (a close code in the 40xx
 * range).
 */
function isCustomCloseEvent(
  error: IWebSocketEvent | Error
): error is IWebSocketCloseEvent {
  return isCloseEvent(error) && error.code >= 4000 && error.code < 4100;
}

export type Delegates<T extends BaseAuthResult> = {
  authenticate: () => Promise<T>;
  createSocket: (authValue: T) => IWebSocketInstance;
};

function enableTracing(machine: FSM<Context, Event, State>) {
  const start = new Date().getTime();

  function log(...args: unknown[]) {
    console.warn(
      `${((new Date().getTime() - start) / 1000).toFixed(2)} [FSM #${
        machine.id
      }]`,
      ...args
    );
  }
  const unsubs = [
    machine.events.didReceiveEvent.subscribe((e) => log(`Event ${e.type}`)),
    machine.events.willTransition.subscribe(({ from, to }) =>
      log("Transitioning", from, "→", to)
    ),
    machine.events.didIgnoreEvent.subscribe((e) =>
      log("Ignored event", e.type, e, "(current state won't handle it)")
    ),
    // machine.events.willExitState.subscribe((s) => log("Exiting state", s)),
    // machine.events.didEnterState.subscribe((s) => log("Entering state", s)),
  ];
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

function defineConnectivityEvents(machine: FSM<Context, Event, State>) {
  // Emitted whenever a new WebSocket connection attempt succeeds
  const statusDidChange = makeEventSource<Status>();
  const didConnect = makeEventSource<void>();
  const didDisconnect = makeEventSource<void>();

  let lastStatus: Status | null = null;

  const unsubscribe = machine.events.didEnterState.subscribe(() => {
    const currStatus = toNewConnectionStatus(machine);
    if (currStatus !== lastStatus) {
      statusDidChange.notify(currStatus);
    }

    if (lastStatus === "connected" && currStatus !== "connected") {
      didDisconnect.notify();
    } else if (lastStatus !== "connected" && currStatus === "connected") {
      didConnect.notify();
    }
    lastStatus = currStatus;
  });

  return {
    statusDidChange: statusDidChange.observable,
    didConnect: didConnect.observable,
    didDisconnect: didDisconnect.observable,
    unsubscribe,
  };
}

const assign = (patch: Partial<Context>) => (ctx: Patchable<Context>) =>
  ctx.patch(patch);

function createConnectionStateMachine<T extends BaseAuthResult>(
  delegates: Delegates<T>,
  enableDebugLogging: boolean
) {
  // Create observable event sources, which this machine will call into when
  // specific events happen
  const onMessage = makeEventSource<IWebSocketMessageEvent>();
  onMessage.pause(); // Pause all message delivery until status is OPEN

  // Emitted whenever the server deliberately closes the connection for
  // a specific Liveblocks reason
  const onLiveblocksError = makeEventSource<LiveblocksError>();

  const initialContext: Context & { authValue: T | null } = {
    successCount: 0,
    authValue: null,
    socket: null,
    backoffDelay: RESET_DELAY,
  };

  // The `machine` is the actual finite state machine instance that will
  // maintain the WebSocket's connection
  const machine = new FSM<Context, Event, State>(initialContext)
    .addState("@idle.initial")
    .addState("@idle.failed")
    .addState("@auth.busy")
    .addState("@auth.backoff")
    .addState("@connecting.busy")
    .addState("@connecting.backoff")
    .addState("@ok.connected")
    .addState("@ok.awaiting-pong");

  //
  // Configure events that can happen from anywhere
  //
  // It's always possible to explicitly get a .reconnect() or .disconnect()
  // from the user.
  //
  machine.addTransitions("*", {
    RECONNECT: {
      target: "@auth.backoff",
      effect: [increaseBackoffDelay, resetSuccessCount],
    },

    DISCONNECT: "@idle.initial",
  });

  //
  // Configure the @idle.* states
  //
  machine
    .onEnter("@idle.*", resetSuccessCount)

    .addTransitions("@idle.*", {
      CONNECT: (_, ctx) =>
        // If we still have a known authValue, try to reconnect to the socket directly,
        // otherwise, try to obtain a new authValue
        ctx.authValue !== null ? "@connecting.busy" : "@auth.busy",
    });

  //
  // Configure the @auth.* states
  //
  machine
    .addTransitions("@auth.backoff", {
      NAVIGATOR_ONLINE: {
        target: "@auth.busy",
        effect: assign({ backoffDelay: RESET_DELAY }),
      },
    })
    .addTimedTransition(
      "@auth.backoff",
      (ctx) => ctx.backoffDelay,
      "@auth.busy"
    )

    .onEnterAsync(
      "@auth.busy",

      () => withTimeout(delegates.authenticate(), AUTH_TIMEOUT),

      // On successful authentication
      (okEvent) => ({
        target: "@connecting.busy",
        effect: assign({
          authValue: okEvent.data,
          backoffDelay: RESET_DELAY,
        }),
      }),

      // Auth failed
      (failedEvent) => {
        if (failedEvent.reason instanceof StopRetrying) {
          return {
            target: "@idle.failed",
            effect: log(LogLevel.ERROR, failedEvent.reason.message),
          };
        }

        return {
          target: "@auth.backoff",
          effect: [
            increaseBackoffDelay,
            log(
              LogLevel.ERROR,
              `Authentication failed: ${
                failedEvent.reason instanceof Error
                  ? failedEvent.reason.message
                  : String(failedEvent.reason)
              }`
            ),
          ],
        };
      }
    );

  //
  // Configure the @connecting.* states
  //

  // Function references
  const onSocketError = (event: IWebSocketEvent) =>
    machine.send({ type: "EXPLICIT_SOCKET_ERROR", event });

  const onSocketClose = (event: IWebSocketCloseEvent) =>
    machine.send({ type: "EXPLICIT_SOCKET_CLOSE", event });

  const onSocketMessage = (event: IWebSocketMessageEvent) =>
    event.data === "pong"
      ? machine.send({ type: "PONG" })
      : onMessage.notify(event);

  function teardownSocket(socket: IWebSocketInstance | null) {
    if (socket) {
      socket.removeEventListener("error", onSocketError);
      socket.removeEventListener("close", onSocketClose);
      socket.removeEventListener("message", onSocketMessage);
      socket.close();
    }
  }

  machine
    .addTransitions("@connecting.backoff", {
      NAVIGATOR_ONLINE: {
        target: "@connecting.busy",
        effect: assign({ backoffDelay: RESET_DELAY }),
      },
    })
    .addTimedTransition(
      "@connecting.backoff",
      (ctx) => ctx.backoffDelay,
      "@connecting.busy"
    )

    .onEnterAsync(
      "@connecting.busy",

      //
      // Use the "createSocket" delegate function (provided to the
      // ManagedSocket) to create the actual WebSocket connection instance.
      // Then, set up all the necessary event listeners, and wait for the
      // "open" event to occur.
      //
      // When the "open" event happens, we're ready to transition to the
      // OK state. This is done by resolving the Promise.
      //
      async (ctx) => {
        let capturedPrematureEvent: IWebSocketEvent | null = null;

        const connect$ = new Promise<[IWebSocketInstance, () => void]>(
          (resolve, rej) => {
            // istanbul ignore next
            if (ctx.authValue === null) {
              throw new Error("No auth authValue"); // This should never happen
            }

            const socket = delegates.createSocket(ctx.authValue as T);

            function reject(event: IWebSocketEvent) {
              capturedPrematureEvent = event;
              socket.removeEventListener("message", onSocketMessage);
              rej(event);
            }

            //
            // Part 1:
            // The `error` and `close` event handlers marked (*) are installed
            // here only temporarily, just to handle this promise-based state.
            // When those get triggered, we reject this promise.
            //
            socket.addEventListener("message", onSocketMessage);
            socket.addEventListener("error", reject); // (*)
            socket.addEventListener("close", reject); // (*)
            socket.addEventListener("open", () => {
              //
              // Part 2:
              // The "open" event just fired, so the server accepted our
              // attempt to connect. We'll go on and resolve() our promise as
              // a result.
              //
              // However, we cannot safely remove our error/close rejection
              // handlers _just yet_. There is a small, unlikely-but-possible
              // edge case: if (and only if) any close/error events are
              // _already_ queued up in the event queue before this handler is
              // invoked, then those will fire before our promise will be
              // resolved.
              //
              // Scenario:
              // - Event queue is empty, listeners are installed
              // - Two events synchronously get scheduled in the event queue: [<open event>, <close event>]
              // - The open handler is invoked (= this very callback)
              // - Event queue now looks like: [<close event>]
              // - We happily continue and resolve the promise
              // - Event queue now looks like: [<close event>, <our resolved promise>]
              // - Close event handler fires, but we already resolved promise! 😣
              //
              // This is what's called a "premature" event here, we'll deal
              // with it in part 3.
              //
              socket.addEventListener("error", onSocketError);
              socket.addEventListener("close", onSocketClose);
              const unsub = () => {
                socket.removeEventListener("error", reject); // Remove (*)
                socket.removeEventListener("close", reject); // Remove (*)
              };

              // Resolve the promise, which will take us to the @ok.* state
              resolve([socket, unsub]);
            });
          }
        );

        return withTimeout(connect$, SOCKET_CONNECT_TIMEOUT).then(
          //
          // Part 3:
          // By now, our "open" event has fired, and the promise has been
          // resolved. Two possible scenarios:
          //
          // 1. The happy path. Most likely.
          // 2. Uh-oh. A premature close/error event has been observed. Let's
          //    reject the promise after all.
          //
          // Any close/error event that will get scheduled after this point
          // onwards, will be caught in the OK state, and dealt with
          // accordingly.
          //
          ([socket, unsub]) => {
            unsub();

            if (capturedPrematureEvent) {
              throw capturedPrematureEvent;
            }

            return socket;
          }
        );
      },

      // Only transition to OK state after a successfully opened WebSocket connection
      (okEvent) => ({
        target: "@ok.connected",
        effect: assign({
          socket: okEvent.data,
          backoffDelay: RESET_DELAY,
        }),
      }),

      // If the WebSocket connection cannot be established
      (failure) => {
        const err = failure.reason as IWebSocketEvent | StopRetrying | Error;

        // Stop retrying if this promise explicitly tells us so. This should,
        // in the case of a WebSocket connection attempt only be the case if
        // there is a configuration error.
        if (err instanceof StopRetrying) {
          return {
            target: "@idle.failed",
            effect: log(LogLevel.ERROR, err.message),
          };
        }

        // Alternatively, it can happen if the server refuses the connection
        // after accepting-then-closing the connection.
        if (isCloseEvent(err) && err.code === 4999 /* Close Without Retry */) {
          return {
            target: "@idle.failed",
            effect: log(LogLevel.ERROR, err.reason),
          };
        }

        // We may skip re-authenticating only if this is a close event with
        // a known custom close code, *except* when it's a 4001 (explicitly Not
        // Allowed).
        if (isCustomCloseEvent(err) && err.code !== 4001 /* Not Allowed */) {
          return {
            target: "@connecting.backoff",
            effect: [
              increaseBackoffDelayAggressively,
              logPrematureErrorOrCloseEvent(err),
            ],
          };
        }

        // In all other cases, always re-authenticate!
        return {
          target: "@auth.backoff",
          effect: [increaseBackoffDelay, logPrematureErrorOrCloseEvent(err)],
        };
      }
    );

  //
  // Configure the @ok.* states
  //
  // Keeps a heartbeat alive with the server whenever in the @ok.* state group.
  // 30 seconds after entering the "@ok.connected" state, it will emit
  // a heartbeat, and awaits a PONG back that should arrive within 2 seconds.
  // If this happens, then it transitions back to normal "connected" state, and
  // the cycle repeats. If the PONG is not received timely, then we interpret
  // it as an implicit connection loss, and transition to reconnect (throw away
  // this socket, and open a new one).
  //

  const sendHeartbeat: Target<Context, Event | BuiltinEvent, State> = {
    target: "@ok.awaiting-pong",
    effect: (ctx: Context) => {
      ctx.socket?.send("ping");
    },
  };

  machine
    .addTimedTransition("@ok.connected", HEARTBEAT_INTERVAL, sendHeartbeat)
    .addTransitions("@ok.connected", {
      NAVIGATOR_OFFLINE: sendHeartbeat, // Don't take the browser's word for it when it says it's offline. Do a ping/pong to make sure.
      WINDOW_GOT_FOCUS: sendHeartbeat,
    });

  machine
    .onEnter("@ok.*", (ctx) => {
      ctx.patch({ successCount: ctx.successCount + 1 });

      const timerID = setTimeout(
        // On the next tick, start delivering all messages that have already
        // been received, and continue synchronous delivery of all future
        // incoming messages.
        onMessage.unpause,
        0
      );

      // ...but when *leaving* OK state, always tear down the old socket. It's
      // no longer valid.
      return (ctx) => {
        teardownSocket(ctx.socket);
        ctx.patch({ socket: null });
        clearTimeout(timerID);
        onMessage.pause();
      };
    })

    .addTransitions("@ok.awaiting-pong", { PONG: "@ok.connected" })
    .addTimedTransition("@ok.awaiting-pong", PONG_TIMEOUT, {
      target: "@connecting.busy",
      // Log implicit connection loss and drop the current open socket
      effect: log(
        LogLevel.WARN,
        "Received no pong from server, assume implicit connection loss."
      ),
    })

    .addTransitions("@ok.*", {
      // When a socket receives an error, this can cause the closing of the
      // socket, or not. So always check to see if the socket is still OPEN or
      // not. When still OPEN, don't transition.
      EXPLICIT_SOCKET_ERROR: (_, context) => {
        if (context.socket?.readyState === 1 /* WebSocket.OPEN */) {
          // TODO Do we need to forward this error to the client?
          return null; /* Do not leave OK state, socket is still usable */
        }

        return {
          target: "@connecting.backoff",
          effect: increaseBackoffDelay,
        };
      },

      EXPLICIT_SOCKET_CLOSE: (e) => {
        // Server instructed us to stop retrying, so move to failed state
        if (e.event.code === 4999) {
          return {
            target: "@idle.failed",
            effect: logPermanentClose,
          }; // Should not retry, give up
        }

        // Server instructs us to reauthenticate
        if (e.event.code === 4001 /* Not Allowed */) {
          return {
            target: "@auth.backoff",
            effect: [increaseBackoffDelay, logCloseEvent(e.event)],
          };
        }

        // If this is a custom Liveblocks server close reason, back off more
        // aggressively, and emit a Liveblocks error event...
        if (isCustomCloseEvent(e.event)) {
          return {
            target: "@connecting.backoff",
            effect: [
              increaseBackoffDelayAggressively,
              logCloseEvent(e.event),
              () => {
                const err = new LiveblocksError(e.event.reason, e.event.code);
                onLiveblocksError.notify(err);
              },
            ],
          };
        }

        // Consider this close event a temporary hiccup, and try re-opening
        // a new socket
        return {
          target: "@connecting.backoff",
          effect: [increaseBackoffDelay, logCloseEvent(e.event)],
        };
      },
    });

  // Lastly, register an event handler to listen for window-focus events as
  // soon as the machine starts, and use it to send itself "WINDOW_GOT_FOCUS"
  // events.
  if (typeof document !== "undefined") {
    const doc = typeof document !== "undefined" ? document : undefined;
    const win = typeof window !== "undefined" ? window : undefined;
    const root = win ?? doc;

    machine.onEnter("*", (ctx) => {
      function onNetworkOffline() {
        machine.send({ type: "NAVIGATOR_OFFLINE" });
      }

      function onNetworkBackOnline() {
        machine.send({ type: "NAVIGATOR_ONLINE" });
      }

      function onVisibilityChange() {
        if (doc?.visibilityState === "visible") {
          machine.send({ type: "WINDOW_GOT_FOCUS" });
        }
      }

      win?.addEventListener("online", onNetworkBackOnline);
      win?.addEventListener("offline", onNetworkOffline);
      root?.addEventListener("visibilitychange", onVisibilityChange);
      return () => {
        root?.removeEventListener("visibilitychange", onVisibilityChange);
        win?.removeEventListener("online", onNetworkBackOnline);
        win?.removeEventListener("offline", onNetworkOffline);

        // Also tear down the old socket when stopping the machine, if there is one
        teardownSocket(ctx.socket);
      };
    });
  }

  const cleanups = [];

  const { statusDidChange, didConnect, didDisconnect, unsubscribe } =
    defineConnectivityEvents(machine);
  cleanups.push(unsubscribe);

  // Install debug logging
  if (enableDebugLogging) {
    cleanups.push(enableTracing(machine));
  }

  // Start the machine
  machine.start();

  return {
    machine,
    cleanups,

    // Observable events that will be emitted by this machine
    events: {
      statusDidChange,
      didConnect,
      didDisconnect,
      onMessage: onMessage.observable,
      onLiveblocksError: onLiveblocksError.observable,
    },
  };
}

/**
 * The ManagedSocket will set up a WebSocket connection to a room, and maintain
 * that connection over time.
 *
 * It's a light wrapper around the actual FSM that implements the logic,
 * exposing just a few safe actions and events that can be called or observed
 * from the outside.
 */
export class ManagedSocket<T extends BaseAuthResult> {
  /** @internal */
  private machine: FSM<Context, Event, State>;
  private cleanups: (() => void)[];

  public readonly events: {
    /**
     * Emitted when the WebSocket connection goes in or out of "connected"
     * state.
     */
    readonly statusDidChange: Observable<Status>;
    /**
     * Emitted when the WebSocket connection is first opened.
     */
    readonly didConnect: Observable<void>;
    /**
     * Emitted when the current WebSocket connection is lost and the socket
     * becomes useless. A new WebSocket connection must be made after this to
     * restore connectivity.
     */
    readonly didDisconnect: Observable<void>; // Deliberate close, a connection loss, etc.

    /**
     * Emitted for every incoming message from the currently active WebSocket
     * connection.
     */
    readonly onMessage: Observable<IWebSocketMessageEvent>;

    /**
     * Emitted whenever a connection gets closed for a known error reason, e.g.
     * max number of connections, max number of messages, etc.
     */
    readonly onLiveblocksError: Observable<LiveblocksError>;
  };

  constructor(delegates: Delegates<T>, enableDebugLogging: boolean = false) {
    const { machine, events, cleanups } = createConnectionStateMachine(
      delegates,
      enableDebugLogging
    );
    this.machine = machine;
    this.events = events;
    this.cleanups = cleanups;
  }

  getLegacyStatus(): LegacyConnectionStatus {
    return newToLegacyStatus(this.getStatus());
  }

  getStatus(): Status {
    try {
      return toNewConnectionStatus(this.machine);
    } catch {
      return "initial";
    }
  }

  /**
   * Returns the current auth authValue.
   */
  get authValue(): T | null {
    return this.machine.context.authValue as T | null;
  }

  /**
   * Call this method to try to connect to a WebSocket. This only has an effect
   * if the machine is idle at the moment, otherwise this is a no-op.
   */
  public connect(): void {
    this.machine.send({ type: "CONNECT" });
  }

  /**
   * If idle, will try to connect. Otherwise, it will attempt to reconnect to
   * the socket, potentially obtaining a new authValue first, if needed.
   */
  public reconnect(): void {
    this.machine.send({ type: "RECONNECT" });
  }

  /**
   * Call this method to disconnect from the current WebSocket. Is going to be
   * a no-op if there is no active connection.
   */
  public disconnect(): void {
    this.machine.send({ type: "DISCONNECT" });
  }

  /**
   * Call this to stop the machine and run necessary cleanup functions. After
   * calling destroy(), you can no longer use this instance. Call this before
   * letting the instance get garbage collected.
   */
  public destroy(): void {
    this.machine.stop();

    let cleanup: (() => void) | undefined;
    while ((cleanup = this.cleanups.pop())) {
      cleanup();
    }
  }

  /**
   * Safely send a message to the current WebSocket connection. Will emit a log
   * message if this is somehow impossible.
   */
  public send(data: string): void {
    const socket = this.machine.context?.socket;
    if (socket === null) {
      console.warn("Cannot send: not connected yet", data);
    } else if (socket.readyState !== 1 /* WebSocket.OPEN */) {
      console.warn("Cannot send: WebSocket no longer open", data);
    } else {
      socket.send(data);
    }
  }

  /**
   * NOTE: Used by the E2E app only, to simulate explicit events.
   * Not ideal to keep exposed :(
   */
  public _privateSendMachineEvent(event: Event): void {
    this.machine.send(event);
  }
}
