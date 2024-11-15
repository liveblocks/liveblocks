import type { Json } from "./lib/Json.js";
import { Store } from "./Store.js";
import type { ChangeReturnType, OmitFirstArg } from "./ts-toolkit.js";
import type { Delta, Mutation, Mutations, Op, OpId } from "./types.js";
import { opId } from "./utils.js";

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, OpId>;
};

export class Client<M extends Mutations> {
  // #currentSession: Session; ??
  // #actor?: number;
  #store: Store<M>;
  mutate: BoundMutations<M>;

  // The pending ops list is a sequence of mutations that need to happen.
  // We rely on the fact that Map iteration will return elements in
  // *insertion order*, but it also allows us to efficiently remove acknowledgd
  // ops.
  #pendingOps: Map<OpId, Op>;

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
        this.#store.applyOp(op);
        // this.#eventSource.notify(op);
        return id;
      }) as any;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    }
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
      this.#store.applyOp(pendingOp);
    }
  }

  // For convenience in unit tests only --------------------------------
  applyDelta(delta: Delta): void { return this.applyDeltas([delta]); } // prettier-ignore
  asObject(): Record<string, Json> { return this.#store.asObject(); } // prettier-ignore
}
