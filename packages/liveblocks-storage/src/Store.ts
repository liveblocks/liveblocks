import type { Json } from "~/lib/Json.js";

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
   * Used by unit tests only to observe the cache contents.
   * @internal
   */
  toObject(): Record<string, Json> {
    return Object.fromEntries(this.#cache);
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
  applyOp(op: Op, returnDelta: true): Delta;
  applyOp(op: Op, returnDelta: false): undefined;
  applyOp(op: Op, returnDelta: boolean): Delta | undefined {
    const [id, name, args] = op;
    const mutationFn =
      this.#mutations[name] ?? raise(`Mutation not found: '${name}'`);

    this.#cache.startTransaction();
    try {
      mutationFn(this.#cache, ...args);
      // XXX Computing the full Delta is overhead that's not needed by the client.
      // XXX Probably better to avoid computing it on the Client for performance reasons.
      const delta = returnDelta ? this.#cache.delta(id) : undefined;
      this.#cache.commit();
      return delta;
    } catch (e) {
      this.#cache.rollback();
      throw e;
    }
  }
}
