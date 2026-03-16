import { shallow } from "@liveblocks/core";

export function pick<T extends object, K extends PropertyKey>(
  from: T,
  keys: readonly K[]
): Partial<Record<K, unknown>> {
  const result: Partial<Record<K, unknown>> = {};

  for (const key of keys) {
    const value = (from as Record<PropertyKey, unknown>)[key];

    if (value !== undefined && value !== null) {
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

export function reconcile<T>(map: Map<string, T>, next: T, key: string) {
  const previous = map.get(key);

  if (previous && shallow(previous, next)) {
    return previous;
  }

  map.set(key, next);

  return next;
}

export function setOrDelete<T extends object>(
  map: Map<string, T>,
  key: string,
  changes: T
): void {
  const next: Record<string, unknown> = {};

  for (const change in changes) {
    const value = (changes as Record<string, unknown>)[change];

    // Falsy values are deleted from the map.
    if (value) {
      next[change] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    map.set(key, next as T);
  } else {
    map.delete(key);
  }
}
