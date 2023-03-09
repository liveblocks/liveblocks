import type { LiveList } from "@liveblocks/core";

import type { LiveDescendant, LiveParent } from "../types";
import { isLiveElement } from "../types";

export function getLiveChildren(parent: LiveParent): LiveList<LiveDescendant> {
  if (isLiveElement(parent)) {
    return parent.get("children");
  }

  return parent;
}
