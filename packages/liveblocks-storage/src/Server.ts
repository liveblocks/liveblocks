import type { Callback } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import { Store } from "./Store.js";
import type {
  ClientMsg,
  Delta,
  Mutations,
  Op,
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
  #nextActor = 1;
  #sessions: Set<Session>;
  #store: Store;
  #_log?: (...args: unknown[]) => void;

  constructor(mutations: Mutations) {
    this.#sessions = new Set();
    this.#store = new Store(mutations);

    if (DEBUG) this.debug();
  }

  debug(): void {
    this.#_log = (...args) => console.log("[server]", ...args);
  }

  // XXX This method should be removed from the Server!!!!!!!!!!!!!!!!!!!
  applyOp(op: Op): Delta {
    return this.#store.applyOp(op, true);
  }

  connect(socket: Socket<ServerMsg, ClientMsg>): Callback<void> {
    const newSession = {
      actor: this.#nextActor++,
      sessionKey: nanoid(8),
      socket,
    };

    // Start listening to incoming ClientMsg messages on this socket
    const disconnect = socket.recv.subscribe((msg) =>
      this.#handleClientMsg(newSession, msg)
    );

    this.#sessions.add(newSession);

    return () => {
      // Tear down pipes
      disconnect();
      this.#sessions.delete(newSession);
    };
  }

  // TODO We could inline this inside the connect() closure above
  #handleClientMsg(curr: Session, message: ClientMsg): void {
    this.#_log?.(`IN (from ${curr.actor})`, message);

    const op: Op = message;
    const result = this.#tryApplyOp(op);

    if (result.ok) {
      // Fan-out delta to all connected clients
      for (const session of this.#sessions) {
        this.#_log?.(`OUT (to ${session.actor})`, result.delta);
        session.socket.send(result.delta);
      }
    } else {
      // Send error/ack back to origin
      const ack: Delta = [op[0], [], []];
      this.#_log?.(`OUT (to ${curr.actor})`, ack);
      curr.socket.send(ack);
    }
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
  get data(): Record<string, Json> { return this.#store.toObject(); } // prettier-ignore
}
