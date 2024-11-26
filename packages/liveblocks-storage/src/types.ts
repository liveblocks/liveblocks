import type { Observable } from "./lib/EventSource.js";
import type { Json } from "./lib/Json.js";
import type { LiveObject } from "./LiveObject.js";

export type Socket<Out, In> = {
  send: (data: Out) => void;
  recv: Observable<In>;
};

export type NodeId = string; // TODO Maybe brand later?

/**
 * A unique Op ID for this Op. Lamport clock consisting of the original actor
 * ID that first sent the Op to the server and a client clock.
 */
export type OpId = readonly [
  /** The *original* actor that first sent the Op to the server. Stays bound to
   * that actor, even if the current client's session already has a newer actor
   * ID. */
  actor: number,
  clock: number,
];

export type Op = readonly [name: string, args: readonly Json[]];

export type PendingOp = {
  /**
   * The actor ID that was used to first send this Op to the server. Not set
   * until the client actually sends the Op out for first time. At that point,
   * the Op gets bound to that actor. If later the client reconnects and gets
   * a new session with a different actor ID, the Op will remain bound to the
   * original actor it was sent with, because its identity must remain stable.
   */
  actor?: number;
  readonly clock: number;
  readonly op: Op;
};

export type Delta = readonly [
  /** Keys to remove */
  rem: { readonly [nodeId: NodeId]: readonly string[] },

  /**
   * Keys to add, stored in a single array of alternating keys and values.
   * e.g. [key1,value1,key2,value2,etc...]
   */
  add: {
    readonly [nodeId: NodeId]: {
      readonly [key: string]: Json;
    };
  },
];

//
// NOTE
// Using "type": "DeltaServerMsg" for now, just for clarity. We can make this
// way more compact later.
// Serialize/deserialize using CBOR later to make it more lightweight?
//

export type CatchUpClientMsg = {
  type: "CatchUpClientMsg";
  /**
   * Tells the server the last clock value this client knows about. The server
   * can respond with a partial or full initial sync (up to the server to
   * decide).
   */
  since: number;
};

export type OpClientMsg = {
  type: "OpClientMsg";
  /** The unique Op ID for this Op. Lamport clock consisting of the original
   * actor ID that first sent the Op to the server and a client clock. */
  opId: OpId;
  /** The Op (= name + args), describing the mutator to run on the server. */
  op: Op;
};

export type ClientMsg = CatchUpClientMsg | OpClientMsg;

export type WelcomeServerMsg = {
  type: "WelcomeServerMsg";
  /**
   * The assigned unique ID for this session. (If a client reconnects, they
   * will get a new actor ID.)
   */
  actor: number;
  /**
   * A unique key to identify this session. Will be unique and only known to
   * this client. Sometimes also known as `nonce`.
   */
  sessionKey: string;
  /**
   * The server's current logical clock value (incremented any time the store changes).
   * Clients can use this value to determine if they're behind and need to catch up.
   */
  serverClock: number;
};

export type InitialSyncServerMsg = {
  type: "InitialSyncServerMsg";
  /** The current server clock */
  serverClock: number;
  /**
   * The delta for the client to apply. By default, this is a partial delta.
   * The server can also decide to send a full carbon copy (CC) of its state
   * instead of a delta.
   */
  delta: Delta;
  /**
   * By default, a delta describes a partial state update. The server can also
   * decide to send a full carbon copy (CC) of its state instead of a delta.
   */
  fullCC?: true;
};

export type DeltaServerMsg = {
  type: "DeltaServerMsg";
  /** The new server clock after the update. */
  serverClock: number;
  /**
   * The original opId that created this mutation. This can be used to
   * acknowledge a mutation has been processed (so the client won't need to
   * resend it).
   */
  opId: OpId;
  /**
   * The delta for the client to apply. By default, this is a partial delta.
   * The server can also decide to send a full carbon copy (CC) of its state
   * instead of a delta.
   */
  delta: Delta;
  /**
   * By default, a delta describes a partial state update. The server can also
   * decide to send a full carbon copy (CC) of its state instead of a delta.
   */
  fullCC?: true;
};

export type ServerMsg =
  | WelcomeServerMsg
  | InitialSyncServerMsg
  | DeltaServerMsg;

export interface Transaction {
  nextId(): string;
  has(nodeId: NodeId, key: string): boolean;
  get(nodeId: NodeId, key: string): Json | undefined;
  keys(nodeId: NodeId): IterableIterator<string>;
  // values(nodeId: NodeId): IterableIterator<Json>;
  set(nodeId: NodeId, key: string, value: Json): void;
  delete(nodeId: NodeId, key: string): boolean;
}

export type Mutation = (
  root: LiveObject,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: readonly any[]
) => void;

export type Mutations = Record<string, Mutation>;
