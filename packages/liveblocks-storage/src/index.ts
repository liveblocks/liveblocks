import type { Json } from "~/Json.js";
import type { OmitFirstArg } from "./types.js";

// All deltas are authoritative and _must_ always get applied!
type Op = [name: string, args: Json[]];
type Delta = [add: [key: string, value: Json][], rem: string[]]; // Eventually, we'll need to compress this

/** @internal */
export type Store = Map<string, Json>;

export class StoreStub extends Map<string, Json> {
  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return typeof value === "number" ? value : undefined;
  }
}

export type Mutations = Record<string, Mutation>;
export type Mutation = (store: StoreStub, ...args: readonly any[]) => void;

type BoundMutations<M extends Record<string, Mutation>> = {
  [K in keyof M]: OmitFirstArg<M[K]>;
};

export class Base<M extends Mutations> {
  stub: StoreStub;
  mutate: BoundMutations<M>;

  constructor(mutations: M) {
    this.stub = new StoreStub();

    // Bind all given mutation functions to this instance
    this.mutate = {} as BoundMutations<M>;
    for (const [name, mutFn] of Object.entries(mutations)) {
      this.mutate[name as keyof M] = ((...args: Json[]) =>
        mutFn(this.stub, ...args)) as any;
    }
  }
}

export class Client<M extends Mutations> extends Base<M> {
  /**
   * Authoritative delta from the server. Must be applied and local pending Ops
   * rebased on top of this.
   */
  applyDelta(delta: Delta): void {
    const stub = this.stub;
    const [toAdd, toDelete] = delta;
    toAdd.forEach(([k, v]) => stub.set(k, v));
    toDelete.forEach((k) => stub.delete(k));
  }
}

export class Server<M extends Mutations> extends Base<M> {
  /**
   * Tries to apply the mutation described by the incoming Op, typically
   * received from a Client. The Server will try to apply it, and if
   * successful, will return an authoritative delta, which should be sent to
   * every client.
   */
  applyOp(op: Op): Delta {
    const [name, args] = op;
    this.mutate[name]?.(...args);

    const delta: Delta = [[["foo", "bar"]], []];
    return delta;
  }
}
