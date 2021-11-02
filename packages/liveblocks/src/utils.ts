import { AbstractCrdt } from "./AbstractCrdt";

export function remove<T>(array: T[], item: T) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

export function isSameNodeOrChildOf(
  node: AbstractCrdt,
  parent: AbstractCrdt
): boolean {
  if (node === parent) {
    return true;
  }
  if (node._parent) {
    return isSameNodeOrChildOf(node._parent, parent);
  }
  return false;
}
