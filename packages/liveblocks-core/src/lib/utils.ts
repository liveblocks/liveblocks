import type { Json } from "./Json";

export function isPlainObject(
  blob: unknown
): blob is { [key: string]: unknown } {
  // Implementation borrowed from pojo decoder, see
  // https://github.com/nvie/decoders/blob/78849f843193647eb6b5307240387bdcff7161fb/src/lib/objects.js#L10-L41
  return (
    blob !== null &&
    typeof blob === "object" &&
    Object.prototype.toString.call(blob) === "[object Object]"
  );
}

/**
 * Polyfill for Object.fromEntries() to be able to target ES2015 output without
 * including external polyfill dependencies.
 */
export function fromEntries<K, V>(
  iterable: Iterable<[K, V]>
): { [key: string]: V } {
  const obj: { [key: string]: V } = {};
  for (const [key, val] of iterable) {
    obj[key as unknown as string] = val;
  }
  return obj;
}

/**
 * Drop-in replacement for Object.entries() that retains better types.
 */
export function entries<
  O extends { [key: string]: unknown },
  K extends keyof O
>(obj: O): [K, O[K]][] {
  return Object.entries(obj) as [K, O[K]][];
}

/**
 * Drop-in replacement for Object.keys() that retains better types.
 */
export function keys<O extends { [key: string]: unknown }, K extends keyof O>(
  obj: O
): K[] {
  return Object.keys(obj) as K[];
}

/**
 * Drop-in replacement for Object.values() that retains better types.
 */
export function values<O extends { [key: string]: unknown }>(
  obj: O
): O[keyof O][] {
  return Object.values(obj) as O[keyof O][];
}

/**
 * Alternative to JSON.parse() that will not throw in production. If the passed
 * string cannot be parsed, this will return `undefined`.
 */
export function tryParseJson(rawMessage: string): Json | undefined {
  try {
    // eslint-disable-next-line no-restricted-syntax
    return JSON.parse(rawMessage);
  } catch (e) {
    return undefined;
  }
}

/**
 * Decode base64 string.
 */
export function b64decode(b64value: string): string {
  try {
    const formattedValue = b64value.replace(/-/g, "+").replace(/_/g, "/");
    const decodedValue = decodeURIComponent(
      atob(formattedValue)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return decodedValue;
  } catch (err) {
    return atob(b64value);
  }
}

/**
 * Mutates the array in-place by removing the first occurrence of `item` from
 * the array.
 */
export function remove<T>(array: T[], item: T): void {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === item) {
      array.splice(i, 1);
      break;
    }
  }
}

/**
 * Removes null and undefined values from the array, and reflects this in the
 * output type.
 */
export function compact<T>(items: readonly T[]): NonNullable<T>[] {
  return items.filter(
    (item: T): item is NonNullable<T> => item !== null && item !== undefined
  );
}

/**
 * Returns a new object instance where all explictly-undefined values are
 * removed.
 */
export function compactObject<O extends Record<string, unknown>>(obj: O): O {
  const newObj = { ...obj };
  Object.keys(obj).forEach((k) => {
    const key = k as keyof O;
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
}
