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
import { opId } from "./utils.js";

/** @internal */
export type Store = Map<string, Json>;

export type Mutations = Record<string, Mutation>;
export type Mutation = (stub: Stub, ...args: readonly any[]) => void;

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, OpId>;
};

// ----------------------------------------------------------------------------

export class Base<M extends Mutations> {
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
   * Authoritative delta from the server. Must be applied and local pending Ops
   * rebased on top of this.
   */
  applyDelta(delta: Delta): void {
    const stub = this.#cache;

    // Roll back to snapshot
    stub.rollback();

    const [opId, toDelete, toAdd] = delta;

    // Force-apply delta
    toDelete.forEach((k) => stub.delete(k));
    toAdd.forEach(([k, v]) => stub.set(k, v));

    // Acknowledge the incoming opId by removing it from the pending ops list.
    // If this opId is not found, it's from another client.
    this.ack(opId);

    // Start a new snapshot
    stub.snapshot();

    // Apply all local pending ops
    this.applyPendingOps();
  }

  /**
   * Tries to apply the mutation described by the incoming Op, typically
   * received from a Client. The Server will try to apply it, and if
   * successful, will return an authoritative delta, which should be sent to
   * every client.
   */
  applyOp(op: Op): Delta {
    const [id, name, args] = op;
    const mutationFn = this.#mutations[name];
    if (!mutationFn) {
      throw new Error(`Mutation not found: '${name}'`);
    }

    this.#cache.snapshot();
    try {
      mutationFn(this.#cache, ...args);
      const delta = this.#cache.delta(id);
      this.#cache.commit();
      return delta;
    } catch (e) {
      this.#cache.rollback();
      throw e;
    }
  }

  ack(_opId: OpId): void {
    // Ack is a no-op in the base class
  }

  applyPendingOps(): void {
    // Applying pending ops is a no-op in the base class
  }
}

// ----------------------------------------------------------------------------

export class Client<M extends Mutations> extends Base<M> {
  #pendingOps: Op[];
  mutate: BoundMutations<M>;

  constructor(mutations: M) {
    super(mutations);

    this.#pendingOps = [];

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const name of Object.keys(mutations)) {
      this.mutate[name as keyof M] = ((...args: Json[]): OpId => {
        const op: Op = [opId(), name, args];
        this.#pendingOps.push(op);
        const delta = this.applyOp(op);
        return delta[0];
      }) as any;
    }
  }

  ack(opId: OpId): void {
    const index = this.#pendingOps.findIndex(([id]) => id === opId);
    if (index >= 0) {
      this.#pendingOps.splice(index, 1);
    }
  }

  applyPendingOps(): void {
    for (const pendingOp of this.#pendingOps) {
      this.applyOp(pendingOp);
    }
  }
}

// ----------------------------------------------------------------------------

export class Server<M extends Mutations> extends Base<M> {}
