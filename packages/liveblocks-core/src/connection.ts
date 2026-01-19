import { assertNever } from "./lib/assert";
import { controlledPromise } from "./lib/controlledPromise";
import type { Observable } from "./lib/EventSource";
import { makeBufferableEventSource, makeEventSource } from "./lib/EventSource";
import * as console from "./lib/fancy-console";
import type { BuiltinEvent, Patchable, Target } from "./lib/fsm";
import { FSM } from "./lib/fsm";
import type { Json } from "./lib/Json";
import { tryParseJson, withTimeout } from "./lib/utils";
import { ServerMsgCode } from "./protocol/ServerMsg";
import type {
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";
import {
  shouldDisconnect,
  shouldReauth,
  shouldRetryWithoutReauth,
  WebsocketCloseCodes,
} from "./types/IWebSocket";

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
 * Whether or not the status is an "idle" state. Here, idle means that nothing
 * will happen until some action is taken. Unsurprisingly, these statuses match
 * the start and end states of the state machine.
 */
export function isIdle(status: Status): status is "initial" | "disconnected" {
  return status === "initial" || status === "disconnected";
}

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
    case "@idle.zombie":
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
  | "@idle.zombie"
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

const BACKOFF_DELAYS = [250, 500, 1_000, 2_000, 4_000, 8_000, 10_000] as const;

// Resetting the delay happens upon success. We could reset to 0, but that
// would risk no delay, which generally isn't wise. Instead, we'll reset it to
// the lowest safe delay minus 1 millisecond. The reason is that every time
// a retry happens, the retry delay will first be bumped to the next "tier".
const RESET_DELAY = BACKOFF_DELAYS[0] - 1;

/**
 * Used to back off from WebSocket reconnection attempts after a known
 * Liveblocks issue, like "room full" or a "rate limit" error.
 */
const BACKOFF_DELAYS_SLOW = [2_000, 30_000, 60_000, 300_000] as const;

/**
 * The client will send a PING to the server every 30 seconds, after which it
 * must receive a PONG back within the next 2 seconds. If that doesn't happen,
 * this is interpreted as an implicit connection loss event.
 */
const HEARTBEAT_INTERVAL = 30_000;
const PONG_TIMEOUT = 2_000;

/**
 * Maximum amount of time that the authentication delegate take to return an
 * auth authValue, or else we consider authentication timed out.
 */
const AUTH_TIMEOUT = 10_000;

/**
 * Maximum amount of time that the socket connect delegate may take to return
 * an opened WebSocket connection, or else we consider the attempt timed out.
 */
const SOCKET_CONNECT_TIMEOUT = 10_000;

/**
 * Special error class that can be thrown during authentication to stop the
 * connection manager from retrying.
 */
export class StopRetrying extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

function nextBackoffDelay(
  currentDelay: number,
  delays: readonly number[]
): number {
  return (
    delays.find((delay) => delay > currentDelay) ?? delays[delays.length - 1]
  );
}

function increaseBackoffDelay(context: Patchable<Context>) {
  context.patch({
    backoffDelay: nextBackoffDelay(context.backoffDelay, BACKOFF_DELAYS),
  });
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
    if (isCloseEvent(e)) {
      console.warn(
        `${conn} closed prematurely (code: ${e.code}). Retrying in ${ctx.backoffDelay}ms.`
      );
    } else {
      console.warn(`${conn} could not be established.`, e);
    }
  };
}

function logCloseEvent(event: IWebSocketCloseEvent) {
  const details = [`code: ${event.code}`];
  if (event.reason) {
    details.push(`reason: ${event.reason}`);
  }
  return (ctx: Readonly<Context>) => {
    console.warn(
      `Connection to Liveblocks websocket server closed (${details.join(", ")}). Retrying in ${ctx.backoffDelay}ms.`
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

export type Delegates<T extends BaseAuthResult> = {
  authenticate: () => Promise<T>;
  createSocket: (authValue: T) => IWebSocketInstance;
  canZombie: () => boolean;
};

// istanbul ignore next
function enableTracing(machine: FSM<Context, Event, State>) {
  function log(...args: unknown[]) {
    console.warn(`[FSM #${machine.id}]`, ...args);
  }

  const unsubs = [
    machine.events.didReceiveEvent.subscribe((e) => log(`Event ${e.type}`)),
    machine.events.willTransition.subscribe(({ from, to }) =>
      log("Transitioning", from, "→", to)
    ),
    machine.events.didExitState.subscribe(({ state, durationMs }) =>
      log(`Exited ${state} after ${durationMs.toFixed(0)}ms`)
    ),
    machine.events.didIgnoreEvent.subscribe((e) =>
      log("Ignored event", e.type, e, "(current state won't handle it)")
    ),
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

/**
 * A ConnectionError is a partial data structure to help build a proper
 * LiveblocksError down the line.
 */
type ConnectionError = { message: string; code: number };

function createConnectionStateMachine<T extends BaseAuthResult>(
  delegates: Delegates<T>,
  options: {
    enableDebugLogging: boolean;
    /** In protocol V7, the actor will no longer be available on the token.
     * Instead, the `actor` will be sent to the client via a ROOM_STATE message
     * over an established WebSocket connection. If this setting is set to
     * `true`, the state machine will only jump to "connected" state _after_
     * this message has been received. If this setting is `false`, the machine
     * won't wait for the actor to be received, and instead jump to "connected"
     * as soon as the WebSocket connection is established. */
    waitForActorId: boolean;
  }
) {
  // Create observable event sources, which this machine will call into when
  // specific events happen
  const onMessage = makeBufferableEventSource<IWebSocketMessageEvent>();
  onMessage.pause(); // Pause all message delivery until status is OPEN

  // Emitted whenever the server deliberately closes the connection for
  // a specific Liveblocks reason
  const onConnectionError = makeEventSource<ConnectionError>();

  function fireErrorEvent(message: string, code: number) {
    return () => {
      onConnectionError.notify({ message, code });
    };
  }

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
    .addState("@idle.zombie")
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

      () =>
        withTimeout(
          delegates.authenticate(),
          AUTH_TIMEOUT,
          "Timed out during auth"
        ),

      // On successful authentication
      (okEvent) => ({
        target: "@connecting.busy",
        effect: assign({
          authValue: okEvent.data,
        }),
      }),

      // Auth failed
      (failedEvent) => {
        if (failedEvent.reason instanceof StopRetrying) {
          return {
            target: "@idle.failed",
            effect: [
              log(LogLevel.ERROR, failedEvent.reason.message),
              fireErrorEvent(failedEvent.reason.message, -1),
            ],
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
      async (ctx, signal) => {
        const socketEpoch = performance.now();
        let socketOpenAt: number | null = null;

        let capturedPrematureEvent: IWebSocketEvent | null = null;
        let unconfirmedSocket: IWebSocketInstance | null = null;

        const connect$ = new Promise<[IWebSocketInstance, () => void]>(
          (resolve, rej) => {
            // istanbul ignore next
            if (ctx.authValue === null) {
              throw new Error("No auth authValue"); // This should never happen
            }

            const socket = delegates.createSocket(ctx.authValue as T);
            unconfirmedSocket = socket;

            function reject(event: IWebSocketEvent) {
              capturedPrematureEvent = event;
              socket.removeEventListener("message", onSocketMessage);
              rej(event);
            }

            const [actor$, didReceiveActor] = controlledPromise<void>();
            if (!options.waitForActorId) {
              // Mark the promise as "resolved" immediately, so we won't wait
              // for a ROOM_STATE message to happen.
              didReceiveActor();
            }

            /** Waits until actor is received (from the ROOM_STATE message) */
            function waitForActorId(event: IWebSocketMessageEvent) {
              const serverMsg = tryParseJson(event.data as string) as
                | Record<string, Json>
                | undefined;
              if (serverMsg?.type === ServerMsgCode.ROOM_STATE) {
                if (options.enableDebugLogging && socketOpenAt !== null) {
                  const elapsed = performance.now() - socketOpenAt;
                  console.warn(
                    `[FSM #${machine.id}] Socket open → ROOM_STATE: ${elapsed.toFixed(0)}ms`
                  );
                }
                didReceiveActor();
              }
            }

            //
            // Part 1:
            // The `error` and `close` event handlers marked (*) are installed
            // here only temporarily, just to handle this promise-based state.
            // When those get triggered, we reject this promise.
            //
            socket.addEventListener("message", onSocketMessage);
            if (options.waitForActorId) {
              socket.addEventListener("message", waitForActorId);
            }
            socket.addEventListener("error", reject); // (*)
            socket.addEventListener("close", reject); // (*)
            socket.addEventListener("open", () => {
              socketOpenAt = performance.now();
              if (options.enableDebugLogging) {
                const elapsed = socketOpenAt - socketEpoch;
                console.warn(
                  `[FSM #${machine.id}] Socket epoch → open: ${elapsed.toFixed(0)}ms`
                );
              }

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
                socket.removeEventListener("message", waitForActorId);
              };

              // Resolve the promise only once we received the actor ID from
              // the server. This will act like a traffic light, going green
              // only once the actor is received. If the machine is configured
              // not to wait for the actor, the traffic light will already be
              // green.
              // All messages received in the mean time while waiting for the
              // green light will be played back to the client after the
              // transition to "connected".
              void actor$.then(() => {
                resolve([socket, unsub]);
              });
            });
          }
        );

        return withTimeout(
          connect$,
          SOCKET_CONNECT_TIMEOUT,
          "Timed out during websocket connection"
        )
          .then(
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

              if (signal.aborted) {
                // Trigger cleanup logic in .catch() below. At this point, the
                // promise is already cancelled, so none of the ok/err
                // transitions will take place.
                throw new Error("Aborted");
              }

              if (capturedPrematureEvent) {
                throw capturedPrematureEvent; // Take failure transition
              }

              return socket;
            }
          )
          .catch((e) => {
            teardownSocket(unconfirmedSocket);
            throw e;
          });
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
            effect: [
              log(LogLevel.ERROR, err.message),
              fireErrorEvent(err.message, -1),
            ],
          };
        }

        // If the server actively refuses the connection attempt, stop trying.
        if (isCloseEvent(err)) {
          // The default fall-through behavior is going to be reauthorizing
          // with a back-off strategy. If we know the token was expired however
          // we can reauthorize immediately (without back-off).
          if (err.code === WebsocketCloseCodes.TOKEN_EXPIRED) {
            return "@auth.busy";
          }

          if (shouldRetryWithoutReauth(err.code)) {
            // Retry after backoff, but don't get a new token
            return {
              target: "@connecting.backoff",
              effect: [
                increaseBackoffDelayAggressively,
                logPrematureErrorOrCloseEvent(err),
              ],
            };
          }

          // If the token was not allowed we can stop trying because getting
          // another token for the same user won't help
          if (shouldDisconnect(err.code)) {
            return {
              target: "@idle.failed",
              effect: [
                log(LogLevel.ERROR, err.reason),
                fireErrorEvent(err.reason, err.code),
              ],
            };
          }
        }

        // In all other (unknown) cases, always re-authenticate (but after a back-off)
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
    effect: (ctx) => {
      ctx.socket?.send("ping");
    },
  };

  const maybeHeartbeat: Target<Context, Event | BuiltinEvent, State> = () => {
    // If the browser tab isn't visible currently, ask the application if going
    // zombie is fine
    const doc = typeof document !== "undefined" ? document : undefined;
    const canZombie =
      doc?.visibilityState === "hidden" && delegates.canZombie();
    return canZombie ? "@idle.zombie" : sendHeartbeat;
  };

  machine
    .addTimedTransition("@ok.connected", HEARTBEAT_INTERVAL, maybeHeartbeat)
    .addTransitions("@ok.connected", {
      NAVIGATOR_OFFLINE: maybeHeartbeat, // Don't take the browser's word for it when it says it's offline. Do a ping/pong to make sure.
      WINDOW_GOT_FOCUS: sendHeartbeat,
    });

  machine.addTransitions("@idle.zombie", {
    WINDOW_GOT_FOCUS: "@connecting.backoff", // When in zombie state, the client will try to wake up automatically when the window regains focus
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
        if (shouldDisconnect(e.event.code)) {
          return {
            target: "@idle.failed",
            effect: [
              logPermanentClose,
              fireErrorEvent(e.event.reason, e.event.code),
            ],
          };
        }

        if (shouldReauth(e.event.code)) {
          if (e.event.code === WebsocketCloseCodes.TOKEN_EXPIRED) {
            // Token expiry is a special case, we can reauthorize immediately
            // (without back-off)
            return "@auth.busy";
          } else {
            return {
              target: "@auth.backoff",
              effect: [increaseBackoffDelay, logCloseEvent(e.event)],
            };
          }
        }

        if (shouldRetryWithoutReauth(e.event.code)) {
          // If this is a custom Liveblocks server close reason, back off more
          // aggressively, and emit a Liveblocks error event...
          return {
            target: "@connecting.backoff",
            effect: [increaseBackoffDelayAggressively, logCloseEvent(e.event)],
          };
        }

        // Consider any other close event a temporary network hiccup, and retry
        // after a normal backoff delay
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
  // istanbul ignore next
  if (options.enableDebugLogging) {
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
      onConnectionError: onConnectionError.observable,
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
  #machine: FSM<Context, Event, State>;
  #cleanups: (() => void)[];

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
    readonly onConnectionError: Observable<ConnectionError>;
  };

  constructor(
    delegates: Delegates<T>,
    enableDebugLogging: boolean = false,
    waitForActorId: boolean = true
  ) {
    const { machine, events, cleanups } = createConnectionStateMachine(
      delegates,
      { waitForActorId, enableDebugLogging }
    );
    this.#machine = machine;
    this.events = events;
    this.#cleanups = cleanups;
  }

  getStatus(): Status {
    try {
      return toNewConnectionStatus(this.#machine);
    } catch {
      return "initial";
    }
  }

  /**
   * Returns the current auth authValue.
   */
  get authValue(): T | null {
    return this.#machine.context.authValue as T | null;
  }

  /**
   * Call this method to try to connect to a WebSocket. This only has an effect
   * if the machine is idle at the moment, otherwise this is a no-op.
   */
  public connect(): void {
    this.#machine.send({ type: "CONNECT" });
  }

  /**
   * If idle, will try to connect. Otherwise, it will attempt to reconnect to
   * the socket, potentially obtaining a new authValue first, if needed.
   */
  public reconnect(): void {
    this.#machine.send({ type: "RECONNECT" });
  }

  /**
   * Call this method to disconnect from the current WebSocket. Is going to be
   * a no-op if there is no active connection.
   */
  public disconnect(): void {
    this.#machine.send({ type: "DISCONNECT" });
  }

  /**
   * Call this to stop the machine and run necessary cleanup functions. After
   * calling destroy(), you can no longer use this instance. Call this before
   * letting the instance get garbage collected.
   */
  public destroy(): void {
    this.#machine.stop();

    let cleanup: (() => void) | undefined;
    while ((cleanup = this.#cleanups.pop())) {
      cleanup();
    }
  }

  /**
   * Safely send a message to the current WebSocket connection. Will emit a log
   * message if this is somehow impossible.
   */
  public send(data: string): void {
    const socket = this.#machine.context?.socket;
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
    this.#machine.send(event);
  }
}
