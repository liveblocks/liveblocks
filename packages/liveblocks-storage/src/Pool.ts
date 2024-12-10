import type { LiveStructure, Lson } from "./lib/Lson.js";
import type { LiveObject } from "./LiveObject.js";
import type { NodeId } from "./types.js";

/**
 * The Pool, sometimes also known as "Managed Pool", is a collection of all
 * in-memory Live structures that form a single Liveblocks storage tree.
 *
 * There will always be exactly one root, available through `.getRoot()`. There
 * cannot be any cyclical loops, nor can objects exist in more than one
 * position in the tree.
 *
 * Accessing the same member from the pool twice (e.g. calling
 * `pool.getNode("O1:2")` twice) will always return the same instance.
 *
 * The Pool returns LiveStructures in various of its methods, which in turn
 * will be "views" on a subset of the Pool's data. When values are accessed via
 * Live structures, they use their associated Pool instance to look up the
 * actual values, which may be coming from memory (in the client), or from
 * a SQLite database (on the server).
 */
/** @internal */
export interface Pool {
  nextId<P extends string>(prefix: P): `${P}${number}:${number}`;
  getRoot(): LiveObject;
  getNode(nodeId: NodeId): LiveStructure;
  getChild(nodeId: NodeId, key: string): Lson | undefined;
  setChild(nodeId: NodeId, key: string, value: Lson): void;
  deleteChild(nodeId: NodeId, key: string): boolean;
}
