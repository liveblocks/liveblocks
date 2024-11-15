import type { Json } from "~/lib/Json.js";

import { LayeredCache } from "./LayeredCache.js";
import type { Delta, Mutations, Op } from "./types.js";
import { raise } from "./utils.js";

export class Store<M extends Mutations> {
  // XXX Possibly combine LayeredCache and merge it with Store?
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
  asObject(): Record<string, Json> {
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
    }

    // Start a new snapshot
    cache.snapshot();
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
  // XXX Rename to runMutator?
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
}
