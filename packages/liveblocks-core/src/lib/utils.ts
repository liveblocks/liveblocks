import type { ISODateString } from "../types/ai";
import type { Json } from "./Json";

declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

export type DistributiveOmit<T, K extends PropertyKey> = T extends any
  ? Omit<T, K>
  : never;

// export type DistributivePick<T, K extends keyof T> = T extends any
//   ? Pick<T, K>
//   : never;

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type WithOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P];
};

/**
 * Throw an error, but as an expression instead of a statement.
 */
export function raise(msg: string): never {
  throw new Error(msg);
}

/**
 * Drop-in replacement for Object.entries() that retains better types.
 */
export function entries<
  O extends { [key: string]: unknown },
  K extends keyof O,
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
export function values<O extends Record<string, unknown>>(
  obj: O
): O[keyof O][] {
  return Object.values(obj) as O[keyof O][];
}

/**
 * Drop-in replacement for Object.create() that retains better types.
 */
export function create<O extends Record<string, unknown>>(
  obj: O | null,
  descriptors?: PropertyDescriptorMap & ThisType<O>
): O {
  if (typeof descriptors !== "undefined") {
    return Object.create(obj, descriptors) as O;
  }

  return Object.create(obj) as O;
}

/**
 * Creates a new object by mapping a function over all values. Keys remain the
 * same. Think Array.prototype.map(), but for values in an object.
 */
export function mapValues<V, O extends Record<string, unknown>>(
  obj: O,
  mapFn: (value: O[keyof O], key: keyof O) => V
): { [K in keyof O]: V } {
  const result = {} as { [K in keyof O]: V };
  for (const pair of Object.entries(obj)) {
    const key: keyof O = pair[0];
    if (key === "__proto__") {
      // Avoid setting dangerous __proto__ keys
      continue;
    }
    const value = pair[1] as O[keyof O];
    result[key] = mapFn(value, key);
  }
  return result;
}

/**
 * Alternative to JSON.parse() that will not throw in production. If the passed
 * string cannot be parsed, this will return `undefined`.
 */
export function tryParseJson(rawMessage: string): Json | undefined {
  try {
    // eslint-disable-next-line no-restricted-syntax
    return JSON.parse(rawMessage) as Json;
  } catch (e) {
    return undefined;
  }
}

/**
 * Deep-clones a JSON-serializable value.
 *
 * NOTE: We should be able to replace `deepClone` by `structuredClone` once
 * we've upgraded to Node 18.
 */
export function deepClone<T extends Json>(value: T): T {
  // NOTE: In this case, the combination of JSON.parse() and JSON.stringify
  // won't lead to type unsafety, so this use case is okay.
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(JSON.stringify(value)) as T;
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

export type RemoveUndefinedValues<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined>;
};

/**
 * Returns a new object instance where all explictly-undefined values are
 * removed.
 */
export function compactObject<O extends Record<string, unknown>>(
  obj: O
): RemoveUndefinedValues<O> {
  const newObj = { ...obj };
  Object.keys(obj).forEach((k) => {
    const key = k as keyof O;
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj as RemoveUndefinedValues<O>;
}

/**
 * Returns a promise that resolves after the given number of milliseconds.
 */
export function wait(millis: number): Promise<void> {
  return new Promise((res) => setTimeout(res, millis));
}

/**
 * Returns whatever the given promise returns, but will be rejected with
 * a "Timed out" error if the given promise does not return or reject within
 * the given timeout period (in milliseconds).
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  millis: number,
  errmsg: string
): Promise<T> {
  let timerID: ReturnType<typeof setTimeout> | undefined;
  const timer$ = new Promise<never>((_, reject) => {
    timerID = setTimeout(() => {
      reject(new Error(errmsg));
    }, millis);
  });
  return (
    Promise
      // Race the given promise against the timer. Whichever one finishes
      // first wins the race.
      .race([promise, timer$])

      // Either way, clear the timeout, no matter who won
      .finally(() => clearTimeout(timerID))
  );
}

/**
 * Memoize a promise factory, so that each subsequent call will return the same
 * pending or success promise. If the promise rejects, will retain that failed
 * promise for a small time period, after which the next attempt will reset the
 * memoized value.
 */
export function memoizeOnSuccess<T>(
  factoryFn: () => Promise<T>
): () => Promise<T> {
  let cached: Promise<T> | null = null;
  return () => {
    if (cached === null) {
      cached = factoryFn().catch((err) => {
        //
        // Keep returning the failed promise for any calls to the memoized
        // promise for the next 5 seconds. This time period is a bit arbitrary,
        // but exists to make this play nicely with frameworks like React.
        //
        // In React, after a component is suspended and its promise is
        // rejected, React will re-render the component, and expect the next
        // call to this function to return the rejected promise, so its error
        // can be shown. If we immediately reset this value, then such next
        // render would instantly trigger a new promise which would trigger an
        // infinite loop and keeping the component in loading state forever.
        //
        setTimeout(() => {
          cached = null;
        }, 5_000);
        throw err;
      });
    }
    return cached;
  };
}

/**
 * Polyfill for Array.prototype.findLastIndex()
 */
export function findLastIndex<T>(
  arr: T[],
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i, arr)) {
      return i;
    }
  }
  return -1;
}

export function iso(s: string): ISODateString {
  return new Date(s).toISOString() as ISODateString;
}
