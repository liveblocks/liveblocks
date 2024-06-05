/* eslint-disable @typescript-eslint/no-unsafe-return */

import { stringify } from "@liveblocks/core";

export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args.map((arg) => stringify(arg)));

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;

    cache.set(key, result);

    return result;
  }) as T;
}
