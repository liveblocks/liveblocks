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
  actor: number;
  sessionKey: string;

  // A socket is abstract. Concretely it could be a WebSocket, HTTP, or
  // whatever other thinkable channel
  socket: Socket<ServerMsg, ClientMsg>;
};

export class Server<M extends Mutations> {
  #nextActor = 1;
  #sessions: Set<Session>;
  #store: Store<M>;

  constructor(mutations: M) {
    this.#sessions = new Set();
    this.#store = new Store(mutations);
  }

  // XXX This method should be removed from the Server!!!!!!!!!!!!!!!!!!!
  applyOp(op: Op): Delta {
    return this.#store.applyOp(op);
  }

  connect(clientSocket: Socket<ServerMsg, ClientMsg>): Callback<void> {
    const newSession = {
      actor: this.#nextActor++,
      sessionKey: nanoid(8),
      socket: clientSocket,
    };

    // Set up pipes

    this.#sessions.add(newSession);

    return () => {
      // XXX Return disconnect function

      // Tear down pipes

      this.#sessions.delete(newSession);
    };
  }

  // XXX Inline this inside the connect() closure
  // XXX Rename recvClientMsg?
  handle(message: ClientMsg): void {
    const op: Op = message;
    const delta = this.#store.applyOp(op);

    // Fan-out delta to all connected clients
    for (const session of this.#sessions) {
      session.socket.send(delta);
    }
  }

  // For convenience in unit tests only --------------------------------
  asObject(): Record<string, Json> { return this.#store.asObject(); } // prettier-ignore
}
