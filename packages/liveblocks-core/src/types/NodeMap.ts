import type { ChildStorageNode } from "../protocol/StorageNode";

/**
 * Reverse lookup table for all child nodes (= list of SerializedCrdt values)
 * by their parent node's IDs.
 */
export type ParentToChildNodeMap = Map<
  string, // Parent's node ID
  ChildStorageNode[]
>;
