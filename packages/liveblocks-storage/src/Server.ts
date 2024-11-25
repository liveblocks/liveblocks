import type { Callback } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import { SQLCache } from "./SQLCache.js";
import type {
  ClientMsg,
  Delta,
  Mutations,
  Op,
  ServerMsg,
  Socket,
} from "./types.js";
import { nanoid, raise } from "./utils.js";

type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export type Session = {
  readonly actor: number;
  readonly sessionKey: string;

  // A socket is abstract. Concretely it could be a WebSocket, HTTP, or
  // whatever other thinkable channel
  readonly socket: Socket<ServerMsg, ClientMsg>;
};

const DEBUG = false;

export class Server {
  readonly #mutations: Mutations;
  readonly #cache: SQLCache;

  // Keep track of the highest clock value we've seen from any (previous)
  // actor. This should be persisted and reloaded along with the cache data
  // itself when loading.
  readonly #clocksPerActor: Map<number, number> = new Map();

  #nextActor = 1;
  readonly #sessions: Set<Session>;
  #_log?: (...args: unknown[]) => void;

  constructor(mutations: Mutations) {
    this.#mutations = mutations;
    this.#sessions = new Set();
    this.#cache = new SQLCache();

    if (DEBUG) this.debug();
  }

  /* v8 ignore start */
  debug(): void {
    this.#_log = (...args) =>
      console.log(
        "[server]",
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
  /* v8 ignore stop */

  connect(socket: Socket<ServerMsg, ClientMsg>): Callback<void> {
    const actor = this.#nextActor++;
    const sessionKey = nanoid(8);
    const newSession = { actor, sessionKey, socket };

    // Start listening to incoming ClientMsg messages on this socket
    const disconnect = socket.recv.subscribe((msg) => {
      this.#_log?.(`IN (from ${actor})`, msg);
      this.#handleClientMsg(newSession, msg);
    });

    this.#sessions.add(newSession);

    // Announce to client its actor ID and the current state clock
    this.#send(newSession, {
      type: "WelcomeServerMsg",
      actor,
      sessionKey,
      serverClock: this.#cache.clock,
    });

    return () => {
      // Tear down pipes
      disconnect();
      this.#sessions.delete(newSession);
    };
  }

  #handleClientMsg(curr: Session, msg: ClientMsg): void {
    switch (msg.type) {
      case "OpClientMsg": {
        const op = msg.op;

        // Only run the Op if we've never seen it before
        {
          const [origActor, clock] = msg.opId;
          const highest = this.#clocksPerActor.get(origActor);
          if (highest === undefined || highest < clock) {
            this.#clocksPerActor.set(origActor, clock);
          } else {
            // Ignore it. We've already seen this one (or a later one).
            // Send error/ack back to origin
            const ack: Delta = [{}, {}];
            this.#send(curr, {
              type: "DeltaServerMsg",
              serverClock: this.#cache.clock,
              opId: msg.opId,
              delta: ack,
            });
            return;
          }
        }

        const result = this.#runMutator(op);

        if (result.ok) {
          // Fan-out delta to all connected clients
          for (const session of this.#sessions) {
            this.#send(session, {
              type: "DeltaServerMsg",
              serverClock: this.#cache.clock,
              opId: msg.opId,
              delta: result.value,
            });
          }
        } else {
          // Send error/ack back to origin
          // XXX Send back error here!
          const ack: Delta = [{}, {}];
          this.#send(curr, {
            type: "DeltaServerMsg",
            serverClock: this.#cache.clock,
            opId: msg.opId,
            delta: ack,
          });
        }
        return;
      }

      case "CatchUpClientMsg": {
        //
        // The client is requesting a "catch up" with the server. The last
        // server clock they saw was `msg.since`. The server now has two
        // possible responses:
        // 1. It can send the full document.
        // 2. It can send a partial delta since the given version.
        //
        // We just need to decide on the best heuristic for doing one or the
        // other here.
        //
        // TODO Decide on heuristic/conditional
        // For example, do:
        //   e.g. msg.since === 0 || msg.since > 100
        //
        // Or, based on which of those two outputs produces the smallest
        // message.
        //
        if (msg.since === 0) {
          this.#send(curr, {
            type: "InitialSyncServerMsg",
            serverClock: this.#cache.clock,
            delta: this.#cache.fullDelta(),
            fullCC: true,
          });
        } else {
          this.#send(curr, {
            type: "InitialSyncServerMsg",
            serverClock: this.#cache.clock,
            delta: this.#cache.deltaSince(msg.since),
          });
        }
        return;
      }

      /* v8 ignore start */
      default: {
        // Unexpected client message
        // TODO Terminate the connection?
        return;
      }
      /* v8 ignore stop */
    }
  }

  #send(session: Session, msg: ServerMsg): void {
    this.#_log?.(`OUT (to ${session.actor})`, msg);
    session.socket.send(msg);
  }

  /**
   * Executes the described mutator in a transaction and return the Delta on
   * success. The Delta will be sent as an authoritative delta to all connected
   * clients.
   */
  #runMutator(op: Op): Result<Delta, string> {
    const [name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    try {
      return {
        ok: true,
        value: this.#cache.mutate((tx) => mutationFn(tx, ...args)),
      };
    } catch (e) {
      return { ok: false, error: (e as Error).message || String(e) };
    }
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Json> { return Object.fromEntries(this.#cache); } // prettier-ignore
  get clock(): number { return this.#cache.clock; } // prettier-ignore
}
