import type { Json } from "./Json";

declare const brand: unique symbol;
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

export type DistributiveOmit<T, K extends PropertyKey> = T extends any
  ? Omit<T, K>
  : never;

export type RemoveUndefinedValues<T> = {
  [K in keyof T]-?: Exclude<T[K], undefined>;
};

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
 * Deep-clones a JSON-serializable value.
 */
export function deepClone<T extends Json>(value: T): T {
  // eslint-disable-next-line no-restricted-syntax
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Returns a new object instance where all explicitly-undefined values are
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
