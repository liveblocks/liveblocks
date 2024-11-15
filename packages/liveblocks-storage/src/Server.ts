import type { Callback } from "./lib/EventSource.js";
import type { Pipe } from "./lib/Pipe.js";
import type { ClientMsg, Mutations, ServerMsg, ServerStore } from "./Store.js";
import type { Op } from "./types.js";
import { nanoid } from "./utils.js";

export type Session = {
  actor: number;
  sessionKey: string;
  pipe: Pipe<ServerMsg>; // think socket (or whatever channel)
};

export class Server<M extends Mutations> {
  #nextActor = 1;
  #sessions: Set<Session>;
  #store: ServerStore<M>;

  constructor(store: ServerStore<M>) {
    this.#sessions = new Set();
    this.#store = store;
  }

  connect(clientPipe: Pipe<ServerMsg>): Callback<void> {
    const newSession = {
      actor: this.#nextActor++,
      sessionKey: nanoid(8),
      pipe: clientPipe,
    };

    // Set up pipes

    this.#sessions.add(newSession);

    return () => {
      // XXX Return disconnect function

      // Tear down pipes

      this.#sessions.delete(newSession);
    };
  }

  handle(message: ClientMsg): void {
    const op: Op = message;
    const delta = this.#store.applyOp(op);

    // Fan-out delta to all connected clients
    for (const session of this.#sessions) {
      session.pipe.send(delta);
    }
  }
}
