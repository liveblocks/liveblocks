import type {
  IdTuple,
  SerializedChild,
  SerializedCrdt,
} from "../protocol/SerializedCrdt";

/**
 * Lookup table for nodes (= SerializedCrdt values) by their IDs.
 */
export type NodeMap = Map<
  string, // Node ID
  SerializedCrdt
>;

export type NodeStream = Iterable<IdTuple<SerializedCrdt>>;

/**
 * Reverse lookup table for all child nodes (= list of SerializedCrdt values)
 * by their parent node's IDs.
 */
export type ParentToChildNodeMap = Map<
  string, // Parent's node ID
  IdTuple<SerializedChild>[]
>;
