import { isPlainObject } from "./guards";

function shallowArray(xs: unknown[], ys: unknown[]): boolean {
  if (xs.length !== ys.length) {
    return false;
  }

  for (let i = 0; i < xs.length; i++) {
    if (!Object.is(xs[i], ys[i])) {
      return false;
    }
  }

  return true;
}

function shallowObj(objA: unknown, objB: unknown): boolean {
  // Only try to compare keys/values if these objects are both "pojos" (plain
  // old JavaScript objects)
  if (!isPlainObject(objA) || !isPlainObject(objB)) {
    return false;
  }

  const keysA = Object.keys(objA);
  if (keysA.length !== Object.keys(objB).length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(objB, key) &&
      Object.is(objA[key], objB[key])
  );
}

/**
 * Shallowly compares two given values.
 *
 * - Two simple values are considered equal if they're strictly equal
 * - Two arrays are considered equal if their members are strictly equal
 * - Two objects are considered equal if their values are strictly equal
 *
 * Testing goes one level deep.
 */
export function shallow(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  const isArrayA = Array.isArray(a);
  const isArrayB = Array.isArray(b);
  if (isArrayA || isArrayB) {
    if (!isArrayA || !isArrayB) {
      return false;
    }

    return shallowArray(a, b);
  }

  return shallowObj(a, b);
}
