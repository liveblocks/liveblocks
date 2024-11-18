import type { Callback } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import { Store } from "./Store.js";
import type { ChangeReturnType, OmitFirstArg } from "./ts-toolkit.js";
import type {
  ClientMsg,
  Delta,
  Mutation,
  Mutations,
  Op,
  OpId,
  ServerMsg,
  Socket,
} from "./types.js";
import { opId, raise } from "./utils.js";

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

export class Client<M extends Mutations> {
  #_debugClientId = getClientId();

  // #currentSession: Session; ??
  // #actor?: number;
  #store: Store<M>;
  mutate: BoundMutations<M>;

  // The pending ops list is a sequence of mutations that need to happen.
  // We rely on the fact that Map iteration will return elements in
  // *insertion order*, but it also allows us to efficiently remove acknowledgd
  // ops.
  #pendingOps: Map<OpId, Op>;

  #socket: Socket<ClientMsg, ServerMsg> | null = null;

  // #eventSource: EventSource<Op>;
  // readonly events = {
  //   deltas: makeEventSource(),
  // };

  constructor(mutations: M) {
    this.#store = new Store(mutations);
    this.#pendingOps = new Map();

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const name of Object.keys(mutations)) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      /* eslint-disable @typescript-eslint/no-explicit-any */
      this.mutate[name as keyof M] = ((...args: Json[]): OpId => {
        const id = opId();
        const op: Op = [id, name, args];
        this.#pendingOps.set(id, op);
        this.#store.applyOp(op, false);

        // XXX Ultimately, we should not directly send this Op into the socket,
        // we'll have to maybe throttle these, and also we should never send
        // these out after we've gotten disconnected. Details for now, though!
        const msg = op;
        console.log(`[client ${this.#_debugClientId}] OUT`, msg);
        this.#socket?.send(msg);

        return id;
      }) as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    }
  }

  connect(socket: Socket<ClientMsg, ServerMsg>): Callback<void> {
    if (this.#socket) raise("Already connected");

    // Start listening to incoming ClientMsg messages on this socket
    const disconnect = socket.recv.subscribe((msg) =>
      this.#handleServerMsg(msg)
    );

    this.#socket = socket;
    return () => {
      // Tear down pipes
      this.#socket = null;
      disconnect();
    };
  }

  #handleServerMsg(msg: ServerMsg): void {
    console.log(`[client ${this.#_debugClientId}] IN`, msg);
    this.applyDeltas([msg]);
  }

  applyDeltas(deltas: readonly Delta[]): void {
    // First, let's immediately remove acknowledged pending local Ops
    // Acknowledge the incoming opId by removing it from the pending ops list.
    // If this opId is not found, it's from another client.
    for (const [opId] of deltas) {
      this.#pendingOps.delete(opId);
    }

    this.#store.applyDeltas(deltas);

    // Apply all local pending ops
    for (const pendingOp of this.#pendingOps.values()) {
      this.#store.applyOp(pendingOp, false);
    }
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Json> { return this.#store.toObject(); } // prettier-ignore
}
