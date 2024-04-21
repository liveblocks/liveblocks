import { DefaultMap } from "./DefaultMap.js";

function emptyIterator(): IterableIterator<never> {
  return [][Symbol.iterator]();
}

/**
 * Like an ES6 Map, but two levels deep. Useful for building reverse lookup
 * tables. Will automatically delete second-level maps when they are empty.
 */
export class NestedMap<K1, K2, V> {
  #map: DefaultMap<K1, Map<K2, V>>;

  constructor() {
    this.#map = new DefaultMap(() => new Map<K2, V>());
  }

  get size(): number {
    let total = 0;
    for (const value of this.#map.values()) {
      total += value.size;
    }
    return total;
  }

  count(key1: K1): number {
    return this.#map.get(key1)?.size ?? 0;
  }

  keys(): IterableIterator<K1> {
    return this.#map.keys();
  }

  has(key1: K1, key2: K2): boolean {
    return this.#map.get(key1)?.has(key2) ?? false;
  }

  get(key1: K1, key2: K2): V | undefined {
    return this.#map.get(key1)?.get(key2);
  }

  set(key1: K1, key2: K2, value: V): this {
    this.#map.getOrCreate(key1).set(key2, value);
    return this;
  }

  delete(key1: K1, key2: K2): void {
    this.#map.set(key1, (nested) => {
      nested.delete(key2);
      if (nested.size === 0) {
        return undefined;
      } else {
        return nested;
      }
    });
  }

  clear(): void {
    this.#map.clear();
  }

  *[Symbol.iterator](): IterableIterator<[K1, K2, V]> {
    for (const [key1, nested] of this.#map) {
      for (const [key2, value] of nested) {
        yield [key1, key2, value];
      }
    }
  }

  entriesAt(key1: K1): IterableIterator<[K2, V]> {
    return this.#map.get(key1)?.entries() ?? emptyIterator();
  }

  *filterAt(key1: K1, keys: Iterable<K2>): Iterable<[K2, V]> {
    const nested = this.#map.get(key1);
    if (nested === undefined) {
      return;
    }

    for (const k2 of keys) {
      const value = nested.get(k2);
      if (value !== undefined) {
        yield [k2, value];
      }
    }
  }

  keysAt(key1: K1): IterableIterator<K2> {
    return this.#map.get(key1)?.keys() ?? emptyIterator();
  }

  valuesAt(key1: K1): IterableIterator<V> {
    return this.#map.get(key1)?.values() ?? emptyIterator();
  }

  deleteAll(key1: K1): void {
    this.#map.delete(key1);
  }
}
