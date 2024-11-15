import type { LayeredCache } from "./LayeredCache.js";
import type { Json } from "./lib/Json.js";
import type { Brand } from "./ts-toolkit.js";

// XXX OpId should really be a Lamport timestamp, ie a [actor, clock] tuple
export type OpId = Brand<string, "OpId">;

export type Op = readonly [id: OpId, name: string, args: readonly Json[]];

export type Delta = readonly [
  id: OpId,
  rem: readonly string[],
  add: readonly [key: string, value: Json][],
]; // Eventually, we'll need to compress this

export type ClientMsg = Op;

export type ServerMsg = Delta;

export type Mutation = (
  stub: LayeredCache,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: readonly any[]
) => void;

export type Mutations = Record<string, Mutation>;
