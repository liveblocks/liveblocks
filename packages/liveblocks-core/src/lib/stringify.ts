/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

//
// NOTE! Storing and parsing back explicit-undefined is a temporary hack,
// necessary until we fix this bug:
// https://linear.app/liveblocks/issue/LB-1333/officially-support-querying-for-absence-of-metadata
//
// After fixing that bug, we can also remove this hack.
//
const EXPLICIT_UNDEFINED_PLACEHOLDER = "_explicit_undefined";

function replacer(_key: string, value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          // @ts-expect-error this is fine
          sorted[key] = value[key];
          return sorted;
        }, {})
    : value === undefined
      ? EXPLICIT_UNDEFINED_PLACEHOLDER
      : value;
}

function reviver(key: string, value: unknown) {
  if (!key && value === EXPLICIT_UNDEFINED_PLACEHOLDER) {
    return undefined;
  }

  // For objects, preserve "_explicit_undefined" values as undefined properties
  if (value && typeof value === "object") {
    for (const k in value) {
      // @ts-expect-error this is fine
      if (value[k] === EXPLICIT_UNDEFINED_PLACEHOLDER) {
        Object.defineProperty(value, k, { value: undefined });
      }
    }
  }
  return value;
}

/**
 * Like JSON.stringify(), but returns the same value no matter how keys in any
 * nested objects are ordered.
 */
export function stringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}

/**
 * Like JSON.stringify(), but returns the same value no matter how keys in any
 * nested objects are ordered.
 */
export function unstringify(value: string): unknown {
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(value, reviver) as unknown;
}
