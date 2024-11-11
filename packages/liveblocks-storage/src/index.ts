import type { Json } from "~/Json.js";
import { StoreStub } from "./StoreStub.js";
import type { ChangeReturnType, OmitFirstArg } from "./types.js";

// All deltas are authoritative and _must_ always get applied!
type Op = [name: string, args: Json[]];
type Delta = [rem: string[], add: [key: string, value: Json][]]; // Eventually, we'll need to compress this

/** @internal */
export type Store = Map<string, Json>;

export type Mutations = Record<string, Mutation>;
export type Mutation = (store: StoreStub, ...args: readonly any[]) => void;

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: ChangeReturnType<OmitFirstArg<M[K]>, Delta>;
};

// ----------------------------------------------------------------------------

export class Base<M extends Mutations> {
  // XXX Make private field
  stub: StoreStub;

  // XXX Make private field
  mutations: M;

  // XXX Expose `mutate` on clients only! Make it return a delta instead of a transaction/stub!
  mutate: BoundMutations<M>;

  constructor(mutations: M) {
    this.stub = new StoreStub();

    this.mutations = mutations;

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const [name, mutFn] of Object.entries(mutations)) {
      this.mutate[name as keyof M] = ((...args: Json[]) => {
        this.stub.snapshot();
        try {
          mutFn(this.stub, ...args);

          const deleted: string[] = [];
          const updated: [key: string, value: Json][] = [];
          for (const [key, value] of this.stub.diff()) {
            if (value === undefined) {
              deleted.push(key);
            } else {
              updated.push([key, value]);
            }
          }

          this.stub.commit();

          const delta: Delta = [deleted, updated];
          return delta;
        } catch (e) {
          this.stub.rollback();
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

    try {
      return mutationFn(...args);
    } catch {
      throw new Error("Implement edge case");
    }
  }
}
