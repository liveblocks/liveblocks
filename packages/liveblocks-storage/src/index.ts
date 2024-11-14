import type { Json } from "~/Json.js";
import type { Stub } from "./LayeredCache.js";
import { LayeredCache } from "./LayeredCache.js";
import type {
  ChangeReturnType,
  Delta,
  OmitFirstArg,
  Op,
  OpId,
} from "./types.js";
import { opId, raise } from "./utils.js";

/** @internal */
export type Store = Map<string, Json>;

export type Mutations = Record<string, Mutation>;
export type Mutation = (stub: Stub, ...args: readonly any[]) => void;

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, OpId>;
};

// ----------------------------------------------------------------------------

abstract class BaseStore<M extends Mutations> {
  #cache: LayeredCache;
  #mutations: M;

  constructor(mutations: M) {
    this.#mutations = mutations;

    this.#cache = new LayeredCache();
    this.#cache.snapshot();
  }

  /**
   * Used by unit tests only to observe the cache contents.
   * @internal
   */
  asObject() {
    return Object.fromEntries(this.#cache);
  }

  /**
   * Authoritative delta from the server. When such delta is received, all
   * locally pending Ops that have not yet been acknowledged will be "replayed"
   * on top of the new state.
   */
  applyDeltas(deltas: readonly Delta[]): void {
    const cache = this.#cache;

    // Roll back to snapshot
    cache.rollback();

    for (const delta of deltas) {
      // Apply authoritative delta
      const [opId, deletions, updates] = delta;
      for (const key of deletions) {
        cache.delete(key);
      }
      for (const [key, value] of updates) {
        cache.set(key, value);
      }

      // Acknowledge the incoming opId by removing it from the pending ops list.
      // If this opId is not found, it's from another client.
      this.ack(opId);
    }

    // Start a new snapshot
    cache.snapshot();

    // Apply all local pending ops
    this.applyPendingOps();
  }

  // For convenience in unit tests
  applyDelta(delta: Delta): void {
    this.applyDeltas([delta]);
  }

  /**
   * Executes the given Op on the local cache, and return the Delta.
   *
   * On the Server, this is the method called when an incoming Op is processed.
   * The returned value will get fanned out to all connected clients.
   *
   * On the Client, this is called whenever a local mutation is done, or when
   * a local mutation is replayed after an authoritative delta from the Server.
   */
  applyOp(op: Op): Delta {
    const [id, name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    this.#cache.snapshot();
    try {
      mutationFn(this.#cache, ...args);
      // XXX Computing the full Delta is overhead that's not needed by the client.
      // XXX Probably better to avoid computing it on the Client for performance reasons.
      const delta = this.#cache.delta(id);
      this.#cache.commit();
      return delta;
    } catch (e) {
      this.#cache.rollback();
      throw e;
    }
  }

  protected ack(_opId: OpId): void {
    // Ack is a no-op in the base class
  }

  protected applyPendingOps(): void {
    // Applying pending ops is a no-op in the base class
  }
}

// ----------------------------------------------------------------------------

export class ClientStore<M extends Mutations> extends BaseStore<M> {
  // #eventSource: EventSource<Op>;
  #pendingOps: Op[];

  mutate: BoundMutations<M>;
  // onEmitOp: Observable<Op>;

  constructor(mutations: M) {
    super(mutations);

    this.#pendingOps = [];

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const name of Object.keys(mutations)) {
      this.mutate[name as keyof M] = ((...args: Json[]): OpId => {
        const id = opId();
        const op: Op = [id, name, args];
        this.#pendingOps.push(op);
        this.applyOp(op);
        // this.#eventSource.notify(op);
        return id;
      }) as any;
    }

    // this.onEmitOp = this.#eventSource.observable;
  }

  protected ack(opId: OpId): void {
    const index = this.#pendingOps.findIndex(([id]) => id === opId);
    if (index >= 0) {
      this.#pendingOps.splice(index, 1);
    }
  }

  protected applyPendingOps(): void {
    for (const pendingOp of this.#pendingOps) {
      this.applyOp(pendingOp);
    }
  }
}

// ----------------------------------------------------------------------------

export class ServerStore<M extends Mutations> extends BaseStore<M> {}
