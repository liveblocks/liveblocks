import type { LayeredCache } from "./LayeredCache.js";
import type { Observable } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import type { Brand } from "./ts-toolkit.js";

export type Socket<Out, In> = {
  send: (data: Out) => void;
  recv: Observable<In>;
};

// XXX OpId should really be a Lamport timestamp, ie a [actor, clock] tuple
export type OpId = Brand<string, "OpId">;

export type Op = readonly [id: OpId, name: string, args: readonly Json[]];

export type Delta = readonly [
  // XXX Maybe support multiple ops being acknowledged by the same delta?
  id: OpId,
  rem: readonly string[],
  add: readonly (string | Json)[], // Alternated kv pairs, e.g. [key1,value1,key2,value2,etc...]
]; // Eventually, we'll need to compress this

export type ClientMsg = Op;

export type ServerMsg = Delta;

export type Mutation = (
  root: LayeredCache,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: readonly any[]
) => void;

export type Mutations = Record<string, Mutation>;
