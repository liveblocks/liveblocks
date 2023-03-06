import { assert, nn } from "@liveblocks/core";
import type { Path } from "slate";
import { isLiveElement, isLiveRoot, LiveNode, LiveRoot } from "../types";
import { getLiveChildren } from "./getLiveChildren";

/**
 * Get live node at the specified slate path inside the live slate root.
 * Will throw if no element exists at the path.
 */
export function getLiveNode(root: LiveRoot, path: Path): LiveNode {
  let current: LiveNode = root;
  for (const index of path) {
    assert(
      isLiveRoot(current) || isLiveElement(current),
      "Slate path doesn't match storage state, cannot descent into non-parent node"
    );

    const child = getLiveChildren(current).get(index);
    current = nn(
      child,
      `Slate path doesn't match storage state, cannot get descendant at offset ${index} in ${current}`
    );
  }

  return current;
}
