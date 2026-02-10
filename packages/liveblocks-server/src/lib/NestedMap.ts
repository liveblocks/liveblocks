/**
 * Copyright (c) Liveblocks Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { DefaultMap } from "./DefaultMap";

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

  *keys(): IterableIterator<[K1, K2]> {
    for (const [key1, nested] of this.#map) {
      for (const key2 of nested.keys()) {
        yield [key1, key2];
      }
    }
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
    if (!this.#map.has(key1)) {
      return;
    }

    const nested = this.#map.get(key1)!;
    nested.delete(key2);
    if (nested.size === 0) {
      this.#map.delete(key1);
    }
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
