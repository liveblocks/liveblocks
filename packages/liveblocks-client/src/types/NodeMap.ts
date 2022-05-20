import type { SerializedCrdt, SerializedRootObject } from "./SerializedCrdt";
import type { IdTuple } from "./ServerMsg";

/**
 * Lookup table for nodes (= SerializedCrdt values) by their IDs.
 */
export type NodeMap = Map<
  string, // Node ID
  SerializedCrdt
>;

/**
 * Reverse lookup table for all child nodes (= list of SerializedCrdt values)
 * by their parent node's IDs.
 */
export type ParentToChildNodeMap = Map<
  string, // Parent's node ID
  IdTuple<
    // NOTE: All CRDTs stored in this reverse mapping are guaranteed to have
    // their parentKey property set
    Exclude<SerializedCrdt, SerializedRootObject>
  >[]
>;
