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

export class Server {
  #nextActor = 1;
  #sessions: Set<Session>;
  #store: Store;

  constructor(mutations: Mutations) {
    this.#sessions = new Set();
    this.#store = new Store(mutations);
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
    console.log(`[server] IN (from ${curr.actor})`, message);

    const op: Op = message;
    const delta = this.#store.applyOp(op, true);

    // Fan-out delta to all connected clients
    for (const session of this.#sessions) {
      console.log("[server] OUT", delta);
      session.socket.send(delta);
    }
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Json> { return this.#store.toObject(); } // prettier-ignore
}
