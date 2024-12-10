import type { LiveStructure, Lson } from "./lib/Lson.js";
import type { LiveObject } from "./LiveObject.js";
import type { NodeId } from "./types.js";

/** @internal */
export interface Pool {
  nextId<P extends string>(prefix: P): `${P}${number}:${number}`;
  getRoot(): LiveObject;
  getNode(nodeId: NodeId): LiveStructure;
  getChild(nodeId: NodeId, key: string): Lson | undefined;
  setChild(nodeId: NodeId, key: string, value: Lson): void;
  deleteChild(nodeId: NodeId, key: string): boolean;
}
