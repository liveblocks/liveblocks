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
  id: OpId, // XXX Should we move OpId out of Delta and into DeltaServerMsg?
  rem: readonly string[],
  add: readonly (string | Json)[], // Alternated kv pairs, e.g. [key1,value1,key2,value2,etc...]
]; // Eventually, we'll need to compress this

//
// NOTE
// Using "type": "DeltaServerMsg" for now, just for clarity. We can make this
// way more compact later.
// Serialize/deserialize using CBOR later to make it more lightweight?
//

export type CatchMeUpClientMsg = { type: "CatchMeUpClientMsg"; since: number };
export type OpClientMsg = { type: "OpClientMsg"; op: Op };
export type ClientMsg = CatchMeUpClientMsg | OpClientMsg;

export type FirstServerMsg = {
  type: "FirstServerMsg";
  actor: number;
  sessionKey: string;
  stateClock: 1; // Add for real soon!
};
export type DeltaServerMsg = {
  type: "DeltaServerMsg";
  delta: Delta;

  // Normally a delta will describe a partial change. However, for an initial
  // storage update `full: true` will be true, which means the delta will
  // contain the full document (not a partial delta)
  full?: boolean;
  stateClock: 1; // Add this for real soon!
};
export type ServerMsg = FirstServerMsg | DeltaServerMsg;

export type Mutation = (
  root: LayeredCache,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: readonly any[]
) => void;

export type Mutations = Record<string, Mutation>;
