import type { LiveObject } from "@liveblocks/core";

export type UnwrapLiveObject<T> = T extends LiveObject<infer U> ? U : never;

export function pick<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Partial<Record<K, unknown>> {
  const result: Partial<Record<K, unknown>> = {};

  for (const key of keys) {
    const value = (from as Record<PropertyKey, unknown>)[key];

    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

export function omit<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Omit<T, Extract<K, keyof T>> {
  const result = { ...from } as Partial<T>;

  for (const key of keys) {
    delete (result as Record<PropertyKey, unknown>)[key];
  }

  return result as Omit<T, Extract<K, keyof T>>;
}
