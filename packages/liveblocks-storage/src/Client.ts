import { LayeredCache } from "./LayeredCache.js";
import type { Callback, EventSource, Observable } from "./lib/EventSource.js";
import { makeEventSource } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import type { ChangeReturnType, OmitFirstArg } from "./ts-toolkit.js";
import type {
  ClientMsg,
  Delta,
  FirstServerMsg,
  Mutation,
  Mutations,
  Op,
  OpId,
  ServerMsg,
  Socket,
} from "./types.js";
import { iterPairs, opId, raise } from "./utils.js";

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, OpId>;
};

let nextId = "A";

function getClientId() {
  const curr = nextId;
  if (nextId.endsWith("Z")) {
    nextId = "A".repeat(nextId.length + 1);
  } else {
    nextId =
      nextId.slice(0, -1) +
      String.fromCharCode(nextId[nextId.length - 1]!.charCodeAt(0) + 1);
  }
  return curr;
}

type Session = {
  readonly actor: number;
  readonly sessionKey: string;
  readonly socket: Socket<ClientMsg, ServerMsg>;
  /**
   * Whether the session is caught up with the server.
   *
   * Note that this is a property on the session, not on the client itself! Any
   * time the client reconnects, it needs to catch up with the server again
   * first, to ensure no deltas were missed.
   *
   * Only once the session is caught up it's okay to start (re)sending Ops to
   * the server.
   */
  caughtUp: boolean;
};

const DEBUG = false;

export class Client<M extends Mutations> {
  #_debugClientId = getClientId();
  #_log?: (...args: unknown[]) => void;

  readonly #mutations: Mutations;
  readonly #cache: LayeredCache;
  readonly mutate: BoundMutations<M>;

  // The pending ops list is a sequence of mutations that need to happen.
  // We rely on the fact that Map iteration will return elements in
  // *insertion order*, but it also allows us to efficiently remove acknowledgd
  // ops.
  readonly #pendingOps: Map<OpId, Op>;

  /**
   * The last known server state clock this client has caught up with. Should
   * be persisted together with the local offline state, and pending ops. This
   * number should be sent to the server in the CatchUpClientMsg to let the
   * server decide whether to send a full or partial delta.
   */
  #lastKnownServerClock: number = 0;

  // State in the client changes as follows:
  // - Initial (no socket, no session, not caught up)
  // - Socket established, but we don't have a Session yet
  // - Session established (= actor ID and server clock known)
  // - Caught up, client received initial full doc (or delta), and can (re)send
  //   pending ops
  #session: Session | null = null;

  readonly #events: {
    readonly onMutationError: EventSource<Error>;
    readonly onChange: EventSource<void>;
  };
  readonly events: {
    readonly onMutationError: Observable<Error>;
    // XXX onChange event should have Delta + local/remote as payload
    readonly onChange: Observable<void>;
  };

  debug(): void {
    this.#_log = (...args) =>
      console.log(
        `[client ${this.#_debugClientId}]`,
        ...args.map((x) =>
          typeof x === "string"
            ? x
            : JSON.stringify(x, null, 2)
                .split("\n")
                .map((line) => line.trimStart())
                .join(" ")
        )
      );
  }

  constructor(mutations: M) {
    this.#mutations = mutations;
    this.#cache = new LayeredCache();
    this.#cache.startTransaction();
    this.#pendingOps = new Map();

    // Bind all given mutation functions to this instance
    this.#events = {
      onMutationError: makeEventSource<Error>(),
      onChange: makeEventSource<void>(),
    };
    this.events = {
      onMutationError: this.#events.onMutationError.observable,
      onChange: this.#events.onChange.observable,
    };

    this.mutate = {} as BoundMutations<M>;
    for (const name of Object.keys(mutations)) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      /* eslint-disable @typescript-eslint/no-explicit-any */
      this.mutate[name as keyof M] = ((...args: Json[]): OpId => {
        const id = opId();
        const op: Op = [id, name, args];
        this.#runMutatorOptimistically(op);
        this.#pendingOps.set(id, op);

        // XXX Ultimately, we should not directly send this Op into the socket,
        // we'll have to maybe throttle these, and also we should never send
        // these out after we've gotten disconnected, or before we're caught
        // up to the server state. Details for now, though!
        if (this.#session?.caughtUp) {
          this.#send({ type: "OpClientMsg", op });
        }

        return id;
      }) as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */

      if (DEBUG) this.debug();
    }
  }

  get actor(): number | undefined {
    return this.#session?.actor;
  }

  connect(socket: Socket<ClientMsg, ServerMsg>): Callback<void> {
    if (this.#session) raise("Already connected");

    // Start listening to incoming ClientMsg messages on this socket
    const disconnect = socket.recv.subscribe((msg) => {
      this.#_log?.("IN", msg);

      // The very first message we receive after connecting to the server
      // should be the FirstServerMsg, which we need to complete the connection
      // setup. After this, we have a Session, and we're ready to exchange
      // messages.
      if (!this.#session) {
        if (msg.type !== "FirstServerMsg")
          raise("Expected the first message to be a FirstServerMsg");

        this.#session = {
          actor: msg.actor,
          sessionKey: msg.sessionKey,
          socket,
          caughtUp: false,
        };

        // Client responds with handshake, by optionally sending a initial sync
        // message
        if (msg.serverClock > this.#lastKnownServerClock) {
          // Only request a catch up with the server if we're behind. Otherwise
          // we already know the server state.
          this.#send({
            type: "CatchUpClientMsg",
            since: this.#lastKnownServerClock,
          });
        } else {
          // Otherwise we're already caught up, we don't even need a data exchange
          this.#_log?.("Already up to date, no need to request catch up");
          this.#markCaughtUp();
        }

        return;
      }

      if (msg.type === "FirstServerMsg") {
        if (!this.#session)
          raise("Unexpected message - session already established");
        return;
      }

      this.#handleServerMsg(this.#session, msg);
    });

    return () => {
      // Tear down pipes
      this.#session = null;
      disconnect();
    };
  }

  #markCaughtUp(): void {
    this.#session!.caughtUp = true;

    // If we just got caught up, take the moment to (re)send all pending
    // ops to the server.
    for (const op of this.#pendingOps.values()) {
      this.#send({ type: "OpClientMsg", op });
    }
  }

  #handleServerMsg(
    _curr: Session,
    msg: Exclude<ServerMsg, FirstServerMsg>
  ): void {
    if (msg.type === "DeltaServerMsg") {
      this.applyDeltas([msg.delta], msg.fullCC ?? false);

      if (this.#lastKnownServerClock < msg.serverClock) {
        this.#lastKnownServerClock = msg.serverClock;
      }

      if (msg.isInitialSync) {
        this.#markCaughtUp();
      }
    } else {
      // Unknown (maybe future?) message
      // Let's ignore it
    }
  }

  #send(msg: ClientMsg): void {
    this.#_log?.("OUT", msg);
    this.#session?.socket.send(msg);
  }

  /**
   * Authoritative delta from the server. When such delta is received, all
   * locally pending Ops that have not yet been acknowledged will be "replayed"
   * on top of the new state.
   */
  applyDeltas(deltas: readonly Delta[], full: boolean): void {
    // First, let's immediately remove acknowledged pending local Ops
    // Acknowledge the incoming opId by removing it from the pending ops list.
    // If this opId is not found, it's from another client.
    for (const [opId] of deltas) {
      const deleted = this.#pendingOps.delete(opId);
      if (deleted) {
        this.#_log?.(`Acknowledged pending op ${opId}`);
      }
    }

    const cache = this.#cache;
    if (full) {
      // Normally a delta will describe a partial change. However, for an
      // initial storage update `full: true` will be true, which means the
      // delta will contain the full document (not a partial delta), so let's
      // throw away all local changes, before applying the delta.
      cache.reset();
      cache.startTransaction();
    } else {
      // Roll back current transaction
      cache.rollback();
    }

    for (const delta of deltas) {
      // Apply authoritative delta
      const [, deletions, updates] = delta;
      for (const key of deletions) {
        cache.delete(key);
      }
      for (const [key, value] of iterPairs(updates)) {
        cache.set(key, value);
      }
    }

    // Start a new transaction
    cache.startTransaction();

    // Apply all local pending ops
    for (const pendingOp of this.#pendingOps.values()) {
      try {
        this.#runMutatorOptimistically(pendingOp);
      } catch (err) {
        this.#events.onMutationError.notify(err as Error);
      }
    }
  }

  /**
   * Executes the described mutator in a transaction. This is called whenever
   * a mutation is optimistically run for the first time, or when a local
   * mutation is replayed ("rebased") after an incoming authoritative delta
   * from the Server.
   */
  #runMutatorOptimistically(op: Op): void {
    const [_, name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    const cache = this.#cache;
    cache.startTransaction();
    try {
      mutationFn(cache, ...args);
      cache.commit();
    } catch (e) {
      cache.rollback();
      throw e;
    }
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Json> { return Object.fromEntries(this.#cache); } // prettier-ignore
}
