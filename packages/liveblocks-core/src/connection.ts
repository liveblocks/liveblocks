import type { Observable } from "./lib/EventSource";
import { makeEventSource } from "./lib/EventSource";
import { FSM } from "./lib/fsm";
import type {
  IWebSocketCloseEvent,
  IWebSocketEvent,
  IWebSocketInstance,
  IWebSocketMessageEvent,
} from "./types/IWebSocket";

/**
 * Events that can be sent to the machine externally.
 */
type Event =
  // Public events that can be called on the connection manager
  | { type: "CONNECT" } // e.g. when trying to enter a room
  | { type: "RECONNECT" } // e.g. user asking for an explicit reconnect of the socket
  | { type: "DISCONNECT" } // e.g. leaving the room
  | { type: "WINDOW_GOT_FOCUS" } // e.g. user's browser tab is refocused
  //         ^^^^^^^^^^^^^^^^ XXX Where to handle and what to do exactly on the WINDOW_GOT_FOCUS event?

  // Events that the connection manager will internally deal with
  | { type: "PONG" }
  | { type: "EXPLICIT_SOCKET_ERROR"; event: IWebSocketEvent }
  | { type: "EXPLICIT_SOCKET_CLOSE"; event: IWebSocketCloseEvent };

type State =
  | "@idle.initial"
  | "@idle.failed"
  | "@auth.busy"
  | "@auth.backoff"
  | "@connecting.busy"
  | "@connecting.backoff"
  | "@ok.connected"
  | "@ok.awaiting-pong";

type Context = {
  /**
   * Will be populated with the last known auth token.
   */
  token: string | null;

  /**
   * The current active WebSocket connection to the room. If this is not null
   * on the context, then the socket has successfully been opened.
   */
  socket: IWebSocketInstance | null;

  /**
   * The current retry delay when automatically retrying.
   */
  backoffDelay: number;
  // numRetries: number; // Keep track of the number of retry attempts
};

const BACKOFF_DELAYS = [250, 500, 1000, 2000, 4000, 8000, 10000] as const;
const LOW_DELAY = BACKOFF_DELAYS[0];

/**
 * Used to back off from WebSocket reconnection attempts after a known
 * Liveblocks issue, like "room full" or a "rate limit" error.
 */
// const BACKOFF_DELAYS_SLOW = [2000, 30000, 60000, 300000] as const;

/**
 * The client will send a PING to the server every 30 seconds, after which it
 * must receive a PONG back within the next 2 seconds. If that doesn't happen,
 * this is interpreted as an implicit connection loss event.
 */
const HEARTBEAT_INTERVAL = 30000;
const PONG_TIMEOUT = 2000;

/**
 * Maximum amount of time that the authentication delegate take to return an
 * auth token, or else we consider authentication timed out.
 */
const AUTH_TIMEOUT = 10000;

/**
 * Maximum amount of time that the socket connect delegate may take to return
 * an opened WebSocket connection, or else we consider the attempt timed out.
 */
const SOCKET_CONNECT_TIMEOUT = 10000;

function nextBackoffDelay(
  currentDelay: number,
  delays: readonly number[] = BACKOFF_DELAYS
): number {
  return (
    delays.find((delay) => delay > currentDelay) ?? delays[delays.length - 1]
  );
}

function increaseBackoffDelay(context: Context) {
  return { backoffDelay: nextBackoffDelay(context.backoffDelay) };
}

// function increaseBackoffDelayAggressively(context: Context) {
//   return {
//     backoffDelay: nextBackoffDelay(context.backoffDelay, BACKOFF_DELAYS_SLOW),
//   };
// }

/**
 * Generic promise that will time out after X milliseconds.
 */
function timeoutAfter(millis: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timed out"));
    }, millis);
  });
}

function sendHeartbeat(ctx: Context) {
  console.log("Sending heartbeat...");
  if (!ctx.socket) {
    console.error("This should never happen");
  }
  ctx.socket?.send("ping");
}

type DelegateConfig = {
  authenticate: () => Promise<{ token: string }>;
  connect: (token: string) => IWebSocketInstance;
};

function enableTracing(fsm: FSM<Context, Event, State>) {
  const start = new Date().getTime();

  function log(...args: unknown[]) {
    // eslint-disable-next-line
    console.log(
      `${((new Date().getTime() - start) / 1000).toFixed(2)} [FSM]`,
      ...args
    );
  }
  const unsubs = [
    fsm.events.didReceiveEvent.subscribe((e) => {
      log(`Event ${e.type}`);
    }),
    fsm.events.willTransition.subscribe(({ from, to }) => {
      log("Transitioning", from, "→", to);
    }),
    fsm.events.didPatchContext.subscribe((patch) => {
      log(`Patched: ${JSON.stringify(patch)}`);
      // log(`New context: ${JSON.stringify(fsm.context)}`);
    }),
    fsm.events.didIgnoreEvent.subscribe((e) => {
      log("Ignored event", e, "(current state won't handle it)");
    }),
    // fsm.events.willExitState.subscribe((s) => {
    //   log("Exiting state", s);
    // }),
    // fsm.events.didEnterState.subscribe((s) => {
    //   log("Entering state", s);
    // }),
  ];
  return () => {
    for (const unsub of unsubs) {
      unsub();
    }
  };
}

function setupStateMachine(delegates: DelegateConfig) {
  // Create observable event sources, which this machine will call into when
  // specific events happen
  const onMessage = makeEventSource<IWebSocketMessageEvent>();

  // XXX Needed this way? I don't think we should tie these directly to the
  // outside world. These events need to be handled by the connection manager.
  const onError = makeEventSource<IWebSocketEvent>();

  const initialContext: Context = {
    token: null,
    socket: null,

    // Bumped to the next "tier" every time a connection attempt fails (no matter
    // whether this is for the authentication server or the websocket server).
    // Reset every time a connection succeeded.
    backoffDelay: LOW_DELAY,
    // numRetries: 0,
  };

  const fsm = new FSM<Context, Event, State>(initialContext)
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
  fsm.addTransitions("*", {
    RECONNECT: {
      target: "@auth.backoff",
      assign: increaseBackoffDelay,
    },

    DISCONNECT: "@idle.initial",
  });

  //
  // Configure the @idle.* states
  //
  fsm.addTransitions("@idle.*", {
    CONNECT: (_, ctx) =>
      // If we still have a known token, try to reconnect to the socket directly,
      // otherwise, try to obtain a new token
      ctx.token !== null ? "@connecting.busy" : "@auth.busy",
  });

  //
  // Configure the @auth.* states
  //
  fsm
    .addTimedTransition(
      "@auth.backoff",
      (ctx) => ctx.backoffDelay,
      "@auth.busy"
    )

    .onEnterAsync(
      "@auth.busy",

      () =>
        Promise.race([delegates.authenticate(), timeoutAfter(AUTH_TIMEOUT)]),

      // On successful authentication
      (okEvent) => ({
        target: "@connecting.busy",
        assign: {
          token: okEvent.data.token,
          backoffDelay: LOW_DELAY,
        },
      }),

      // Auth failed
      // XXX TODO If _UNAUTHORIZED_, don't retry, instead go to @idle.failed directly
      (_failedEvent) => ({
        target: "@auth.backoff",
        assign: increaseBackoffDelay,
        // effect: () => {
        //   console.log(`Authentication failed: ${String(failedEvent.reason)}`);
        // },
      })
    );

  //
  // Configure the @connecting.* states
  //
  fsm
    .addTimedTransition(
      "@connecting.backoff",
      (ctx) => ctx.backoffDelay,
      "@connecting.busy"
    )

    .onEnterAsync(
      "@connecting.busy",

      (ctx) => {
        //
        // Use the "connect" delegate to create the WebSocket connection (which
        // will initiate the connection), and set up all the necessary event
        // listeners, then wait until the 'open' event has fired. If this
        // happens, we know we have a WebSocket instance in OPEN state that is
        // ready to use.
        //
        const promise = new Promise<IWebSocketInstance>((resolve, reject) => {
          if (ctx.token === null) {
            throw new Error("No auth token"); // This should never happen
          }

          /**
           * Create the WebSocket, and set up a few event listeners once. The
           * trick being used here is this:
           *
           * XXX EXPLAIN THIS SETUP, and also explain why we won't have to
           * remove the event listeners.
           */
          const socket = delegates.connect(ctx.token);

          // Part 1: used to "promisify" the socket, so we will resolve when
          // the connection opens, but reject if the connection does not.
          socket.addEventListener("error", reject);
          socket.addEventListener("close", reject);
          socket.addEventListener("open", () => {
            socket.removeEventListener("error", reject);
            socket.removeEventListener("close", reject);
            resolve(socket);
          });

          // Part 2: set up the _actual_ event listeners, which can be
          // externally observed.
          socket.addEventListener("error", (event) =>
            fsm.send({
              type: "EXPLICIT_SOCKET_ERROR",
              event,
            })
          );
          socket.addEventListener("close", (event) =>
            fsm.send({
              type: "EXPLICIT_SOCKET_CLOSE",
              event,
            })
          );
          socket.addEventListener("message", (event) => {
            if (event.data === "pong") {
              fsm.send({ type: "PONG" });
            } else {
              onMessage.notify(event);
            }
          });
        });

        return Promise.race([promise, timeoutAfter(SOCKET_CONNECT_TIMEOUT)]);
      },

      // On successful authentication
      (okEvent) => ({
        target: "@ok.connected",
        assign: {
          socket: okEvent.data,
          backoffDelay: LOW_DELAY,
        },
      }),

      // On failure
      (failedEvent) =>
        // XXX TODO If _UNAUTHORIZED_, we should discard the token and jump back
        // to @auth.busy to reattempt authentication
        ({
          target: "@auth.backoff",
          assign: (ctx) => ({
            socket: null, // XXX Should not be needed, as socket should already be null if we get here?
            // XXX If failed because of a "room full" or "rate limit", back off more aggressively here
            backoffDelay: nextBackoffDelay(ctx.backoffDelay),
          }),
          effect: () => {
            console.log(
              `Connection to WebSocket could not be established, reason: ${String(
                failedEvent.reason
              )}`
            );
          },
        })
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
  fsm
    .addTimedTransition("@ok.connected", HEARTBEAT_INTERVAL, {
      target: "@ok.awaiting-pong",
      effect: sendHeartbeat,
    })

    .addTimedTransition("@ok.awaiting-pong", PONG_TIMEOUT, {
      target: "@connecting.busy",
      assign: { socket: null },
      effect: () => {
        // Log implicit connection loss and drop the current open socket
        console.log(
          "Received no pong from server, assume implicit connection loss."
        );
      },
    })

    .addTransitions("@ok.awaiting-pong", { PONG: "@ok.connected" })

    .addTransitions("@ok.*", {
      // When a socket receives an error, this can cause the closing of the
      // socket, or not. So always check to see if the socket is still OPEN or
      // not. When still OPEN, don't transition.
      EXPLICIT_SOCKET_ERROR: (_, context) => {
        if (context.socket?.readyState === WebSocket.OPEN) {
          // TODO: Not here, but do we need to forward this error?
          return null; /* Do not leave OK state, socket is still usable */
        }

        return {
          target: "@connecting.busy",
          assign: increaseBackoffDelay,
        };
      },

      EXPLICIT_SOCKET_CLOSE: (event) =>
        event.event.code === 4999
          ? "@idle.failed" // Should not retry, give up
          : // Like an implicit close, try re-opening a new socket
            {
              target: "@connecting.busy",
              assign: increaseBackoffDelay,
            },
    });

  // Install debug logging

  // Log all state transitions to the console
  enableTracing(fsm); // TODO Remove logging in production

  return {
    fsm,

    // Observable events that will be emitted by this machine
    events: {
      onMessage: onMessage.observable,
      onError: onError.observable,
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
export class ManagedSocket {
  /** @internal */
  private fsm: FSM<Context, Event, State>;

  public readonly events: {
    /**
     * Sent for every incoming message from the currently active WebSocket
     * connection.
     */
    readonly onMessage: Observable<IWebSocketMessageEvent>;

    // /**
    //  * Sent when the connection with the server is lost, either explicitly or
    //  * implicitly.
    //  */
    // readonly onClose: Observable<IWebSocketCloseEvent>;

    /**
     * Called whenever an unknown error happens.
     */
    readonly onError: Observable<IWebSocketEvent>;
  };

  constructor(delegates: DelegateConfig) {
    const { fsm, events } = setupStateMachine(delegates);
    this.fsm = fsm;
    this.events = events;

    fsm.start();
  }

  /**
   * Call this method to try to connect to a WebSocket. This only has an effect
   * if the machine is idle at the moment, otherwise this is a no-op.
   */
  public connect() {
    this.fsm.send({ type: "CONNECT" });
  }

  /**
   * If idle, will try to connect. Otherwise, it will attempt to reconnect to
   * the socket, potentially obtaining a new token first, if needed.
   */
  public reconnect() {
    this.fsm.send({ type: "RECONNECT" });
  }

  /**
   * Call this method to disconnect from the current WebSocket. Is going to be
   * a no-op if there is no active connection.
   */
  public disconnect() {
    this.fsm.send({ type: "DISCONNECT" });
  }

  /**
   * Safely send a message to the current WebSocket connection. Will emit a log
   * message if this is somehow impossible.
   */
  public send(data: string) {
    const socket = this.fsm.context?.socket;
    if (socket === null) {
      console.warn("Cannot send: not connected yet", data);
    } else if (socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot send: WebSocket no longer open", data);
    } else {
      socket.send(data);
    }
  }
}
