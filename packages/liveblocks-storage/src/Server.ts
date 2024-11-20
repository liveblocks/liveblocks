import type { Callback } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import { Store } from "./Store.js";
import type {
  ClientMsg,
  Delta,
  Mutations,
  Op,
  OpId,
  ServerMsg,
  Socket,
} from "./types.js";
import { nanoid } from "./utils.js";

export type Session = {
  readonly actor: number;
  readonly sessionKey: string;

  // A socket is abstract. Concretely it could be a WebSocket, HTTP, or
  // whatever other thinkable channel
  readonly socket: Socket<ServerMsg, ClientMsg>;
};

const DEBUG = false;

export class Server {
  #store: Store;

  // #stateClock: number = 0;
  #nextActor = 1;
  #sessions: Set<Session>;
  #_log?: (...args: unknown[]) => void;

  constructor(mutations: Mutations) {
    this.#sessions = new Set();
    this.#store = new Store(mutations);
    // this.#stateClock = 0;

    if (DEBUG) this.debug();
  }

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
      type: "FirstServerMsg",
      actor,
      sessionKey,
      stateClock: 1,
    });

    return () => {
      // Tear down pipes
      disconnect();
      this.#sessions.delete(newSession);
    };
  }

  // TODO We could inline this inside the connect() closure above
  #handleClientMsg(curr: Session, msg: ClientMsg): void {
    if (msg.type === "OpClientMsg") {
      const op = msg.op;
      const result = this.#tryApplyOp(op);

      if (result.ok) {
        // Fan-out delta to all connected clients
        for (const session of this.#sessions) {
          this.#send(session, {
            type: "DeltaServerMsg",
            delta: result.delta,
            stateClock: 1,
          });
        }
      } else {
        // Send error/ack back to origin
        const ack: Delta = [op[0], [], []];
        this.#send(curr, {
          type: "DeltaServerMsg",
          delta: ack,
          stateClock: 1,
        });
      }
    } else if (msg.type === "CatchUpClientMsg") {
      const kvstream: (string | Json)[] = [];

      for (const [key, value] of this.#store.cache) {
        if (value !== undefined) {
          kvstream.push(key);
          kvstream.push(value);
        }
      }

      this.#send(curr, {
        type: "DeltaServerMsg",
        delta: ["🤝" as OpId, [], kvstream],
        full: true,
        stateClock: 1,
      });
    } else {
      // Unexpected client message
      // TODO Terminate the connection
    }
  }

  #send(session: Session, msg: ServerMsg): void {
    this.#_log?.(`OUT (to ${session.actor})`, msg);
    session.socket.send(msg);
  }

  #tryApplyOp(
    op: Op
  ): { ok: true; delta: Delta } | { ok: false; error: string } {
    try {
      return { ok: true, delta: this.#store.applyOp(op, true) };
    } catch (e) {
      return { ok: false, error: (e as Error).message || String(e) };
    }
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Json> { return Object.fromEntries(this.#store.cache); } // prettier-ignore
}
