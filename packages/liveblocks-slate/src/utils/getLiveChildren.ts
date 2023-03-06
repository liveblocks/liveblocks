import { isLiveElement, LiveParent } from "../types";

export function getLiveChildren(parent: LiveParent) {
  if (isLiveElement(parent)) {
    return parent.get("children");
  }

  return parent;
}
