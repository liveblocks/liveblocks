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

/**
 * Like ES6 map, but also provides a unique reverse lookup index for values
 * stored in the map.
 *
 * Useful for code like:
 *
 *   // Store a list of persons by their IDs, but each person's email must also
 *   // be unique
 *   const map = new UniqueMap((person) => person.email);
 *   map.set(1, { name: 'John Doe', email: 'john@example.org' });
 *   map.set(2, { name: 'John Foo', email: 'john@example.org' });  // Will error!
 *   map.delete(1);
 *   map.set(3, { name: 'Johnny', email: 'john@example.org' });  // Now it's allowed
 *
 *   map.getReverseKey('john@example.org')  // 3
 *   map.getReverse('john@example.org')  // { name: 'Johnny', email: 'john@example.org' }
 *
 */
export class UniqueMap<K, V, UK> extends Map<K, V> {
  //                  /       \
  //        Primary key        Unique key
  #_revMap: Map<UK, K>;
  #_keyFn: (value: V) => UK;

  constructor(
    keyFn: (value: V) => UK
    // entries?: readonly (readonly [K, V])[] | null
  ) {
    super(); // super(entries)
    this.#_keyFn = keyFn;
    this.#_revMap = new Map();
  }

  lookupPrimaryKey(uniqKey: UK): K | undefined {
    return this.#_revMap.get(uniqKey);
  }

  lookup(uniqKey: UK): V | undefined {
    const key = this.#_revMap.get(uniqKey);
    return key !== undefined ? this.get(key) : undefined;
  }

  set(key: K, value: V): this {
    const uniqKey = this.#_keyFn(value);
    const primaryKey = this.#_revMap.get(uniqKey);
    if (primaryKey !== undefined && primaryKey !== key) {
      throw new Error(`Unique key ${String(uniqKey)} already exists`);
    }
    this.#_revMap.set(uniqKey, key);
    return super.set(key, value);
  }

  delete(primaryKey: K): boolean {
    const value = this.get(primaryKey);
    if (value !== undefined) {
      const indexedKey = this.#_keyFn(value);
      this.#_revMap.delete(indexedKey);
    }
    return super.delete(primaryKey);
  }
}
