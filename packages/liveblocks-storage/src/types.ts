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

export type CatchUpClientMsg = { type: "CatchUpClientMsg"; since: number };
export type OpClientMsg = { type: "OpClientMsg"; op: Op };
export type ClientMsg = CatchUpClientMsg | OpClientMsg;

export type FirstServerMsg = {
  type: "FirstServerMsg";
  actor: number;
  sessionKey: string;
  /**
   * The server's current logical clock value (incremented any time the store changes).
   * Clients can use this value to determine if they're behind and need to catch up.
   */
  serverClock: number;
};
export type DeltaServerMsg = {
  type: "DeltaServerMsg";
  /** The new server clock after the update. */
  serverClock: number;
  /**
   * The delta for the client to apply. By default, this is a partial delta.
   * The server can also decide to send a full carbon copy (CC) of its state
   * instead of a delta.
   */
  delta: Delta;
  /**
   * Will be set to true if this is the server's response to a "catch up"
   * request from the client.
   */
  isInitialSync?: true;
  /**
   * By default, a delta describes a partial state update. The server can also
   * decide to send a full carbon copy (CC) of its state instead of a delta.
   */
  fullCC?: true;
};
export type ServerMsg = FirstServerMsg | DeltaServerMsg;

export type Mutation = (
  root: LayeredCache,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: readonly any[]
) => void;

export type Mutations = Record<string, Mutation>;
