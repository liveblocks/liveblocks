import { LiveList } from "@liveblocks/client";
import { assert } from "@liveblocks/core";
import type { LiveDescendant, LiveNode, LiveRoot } from "../types";

// TODO: Internal liveblocks api not exposed by the typings
type InternalLiveNodeApi = {
  _parentNode: (LiveNode & InternalLiveNodeApi) | undefined;
};

/**
 * Get the slate path of a LiveNode inside a live slate root.
 * Will throw if the node isn't a descendant of the slate live root.
 */
export function getSlatePath(root: LiveRoot, node: LiveNode) {
  const path: number[] = [];

  // Type assertion needed here because we need to access the _parentNode internal
  // property not exposed by the @liveblocks/client typings.
  let current = node as LiveNode & InternalLiveNodeApi;

  while (current !== root) {
    const parentNode = current._parentNode;
    assert(!!parentNode, "Node isn't a descendant of slate root");

    if (!(parentNode instanceof LiveList)) {
      current = parentNode;
      continue;
    }

    const index = parentNode.indexOf(current as LiveDescendant);
    // Should never happen
    assert(index !== -1, "Child isn't a child of parent");

    path.unshift(index);
    current = parentNode;
  }

  return path;
}
