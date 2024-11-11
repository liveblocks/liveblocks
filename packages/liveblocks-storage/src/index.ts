import type { Json } from "~/Json.js";
import { chain } from "./itertools.js";
import type { ChangeReturnType, OmitFirstArg } from "./types.js";

// All deltas are authoritative and _must_ always get applied!
type Op = [name: string, args: Json[]];
type Delta = [rem: string[], add: [key: string, value: Json][]]; // Eventually, we'll need to compress this

/** @internal */
export type Store = Map<string, Json>;

const TOMBSTONE = Symbol();
type TombStone = typeof TOMBSTONE;

export class StoreStub {
  _local: Map<string, Json | TombStone>;
  _parentStub?: StoreStub;

  constructor(parentStub?: StoreStub) {
    this._local = new Map();
    this._parentStub = parentStub;
  }

  // ----------------------------------------------------
  // "Convenience" accessors to make implementing mutations easier
  // ----------------------------------------------------

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return typeof value === "number" ? value : undefined;
  }

  // ----------------------------------------------------
  // "Multi-layer" cache idea
  // ----------------------------------------------------

  has(key: string): boolean {
    return this._local.get(key) !== undefined;
  }

  get(key: string): Json | undefined {
    const value = this._local.get(key);
    if (value === TOMBSTONE) {
      return undefined;
    }
    return value !== undefined ? value : this._parentStub?.get(key);
  }

  set(key: string, value: Json): void {
    this._local.set(key, value);
  }

  delete(key: string): void {
    if (this._parentStub) {
      this._local.set(key, TOMBSTONE);
    } else {
      this._local.delete(key);
    }
  }

  *keys(): IterableIterator<string> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.keys()` for performance.
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  *values(): IterableIterator<Json> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.values()` for performance.
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  *localChanges(): IterableIterator<[key: string, value: Json | TombStone]> {
    return this._local.entries();
  }

  *entries(): IterableIterator<[key: string, value: Json]> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.entries()` for performance.
    for (const key of new Set(
      chain(this._local.keys(), this._parentStub?.keys())
    )) {
      const value = this.get(key);
      if (value !== undefined) {
        yield [key, value];
      }
    }
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  startTransaction(): StoreStub {
    return new StoreStub(this);
  }

  commit(): void {
    const parent = this._parentStub;
    if (!parent) {
      throw new Error("Cannot commit in the root stub");
    }

    for (const [key, value] of this._local) {
      if (value === TOMBSTONE) {
        parent.delete(key);
      } else {
        parent.set(key, value);
      }
    }
  }
}

export type Mutations = Record<string, Mutation>;
export type Mutation = (store: StoreStub, ...args: readonly any[]) => void;

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, StoreStub>;
};

// ----------------------------------------------------------------------------

export class Base<M extends Mutations> {
  stub: StoreStub;

  // XXX Expose `mutate` on clients only! Make it return a delta instead of a transaction/stub!
  mutate: BoundMutations<M>;

  constructor(mutations: M) {
    this.stub = new StoreStub();

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const [name, mutFn] of Object.entries(mutations)) {
      this.mutate[name as keyof M] = ((...args: Json[]) => {
        const txn = this.stub.startTransaction();
        try {
          mutFn(txn, ...args);
          txn.commit();
          return txn;
        } catch (e) {
          // Discard the transaction
          throw e;
        }
      }) as any;
    }
  }
}

// ----------------------------------------------------------------------------

export class Client<M extends Mutations> extends Base<M> {
  /**
   * Authoritative delta from the server. Must be applied and local pending Ops
   * rebased on top of this.
   */
  applyDelta(delta: Delta): void {
    const stub = this.stub;
    const [toDelete, toAdd] = delta;
    toDelete.forEach((k) => stub.delete(k));
    toAdd.forEach(([k, v]) => stub.set(k, v));
  }
}

// ----------------------------------------------------------------------------

export class Server<M extends Mutations> extends Base<M> {
  /**
   * Tries to apply the mutation described by the incoming Op, typically
   * received from a Client. The Server will try to apply it, and if
   * successful, will return an authoritative delta, which should be sent to
   * every client.
   */
  applyOp(op: Op): Delta {
    const [name, args] = op;
    const mutationFn = this.mutate[name];
    if (!mutationFn) {
      throw new Error("Implement edge case");
    }

    let txn;
    try {
      txn = mutationFn(...args);
    } catch {
      throw new Error("Implement edge case");
    }

    const updated: [string, Json][] = [];
    const deleted: string[] = [];

    for (const [key, value] of txn.localChanges()) {
      if (value === TOMBSTONE) {
        deleted.push(key);
      } else {
        updated.push([key, value]);
      }
    }

    const delta: Delta = [deleted, updated];
    return delta;
  }
}
