import { LayeredCache } from "./LayeredCache.js";
import type { Delta, Mutations, Op } from "./types.js";
import { raise } from "./utils.js";

export class Store {
  // TODO Possibly combine LayeredCache and merge it with Store?
  readonly #cache: LayeredCache;
  readonly #mutations: Mutations;

  constructor(mutations: Mutations) {
    this.#mutations = mutations;
    this.#cache = new LayeredCache();
  }

  // XXX Exposing the LayeredCache here is a smell!
  get cache(): LayeredCache {
    return this.#cache;
  }

  /**
   * Executes the described mutator in a transaction and return the Delta on
   * success. The Delta will be sent as an authoritative delta to all connected
   * clients.
   */
  runMutator(op: Op): Delta {
    const [id, name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    this.#cache.startTransaction();
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

  /**
   * Executes the described mutator in a transaction. This is called whenever
   * a mutation is optimistically run for the first time, or when a local
   * mutation is replayed ("rebased") after an incoming authoritative delta
   * from the Server.
   */
  runMutatorOptimistically(op: Op): void {
    const [_, name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    this.#cache.startTransaction();
    try {
      mutationFn(this.#cache, ...args);
      this.#cache.commit();
    } catch (e) {
      this.#cache.rollback();
      throw e;
    }
  }
}
