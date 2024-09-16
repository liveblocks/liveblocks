import { isPlainObject, shallow } from "@liveblocks/core";

/**
 * Two-level deep shallow check.
 * Useful for checking equality of { isLoading: false, myData: [ ... ] } like
 * data structures, where you want to do a shallow comparison on the "data"
 * key.
 *
 * NOTE: Works on objects only, not on arrays!
 */
export function shallow2(a: unknown, b: unknown): boolean {
  if (!isPlainObject(a) || !isPlainObject(b)) {
    return shallow(a, b);
  }

  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) && shallow(a[key], b[key])
  );
}
