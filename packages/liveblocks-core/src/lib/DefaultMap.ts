import { raise } from "./utils";

/**
 * Like ES6 map, but takes a default (factory) function which will be used
 * to create entries for missing keys on the fly.
 *
 * Useful for code like:
 *
 *   const map = new DefaultMap(() => []);
 *   map.getOrCreate('foo').push('hello');
 *   map.getOrCreate('foo').push('world');
 *   map.getOrCreate('foo')
 *   // ['hello', 'world']
 *
 */
export class DefaultMap<K, V> extends Map<K, V> {
  #defaultFn?: (key: K) => V;

  /**
   * If the default function is not provided to the constructor, it has to be
   * provided in each .getOrCreate() call individually.
   */
  constructor(
    defaultFn?: (key: K) => V,
    entries?: readonly (readonly [K, V])[] | null
  ) {
    super(entries);
    this.#defaultFn = defaultFn;
  }

  /**
   * Gets the value at the given key, or creates it.
   *
   * Difference from normal Map: if the key does not exist, it will be created
   * on the fly using the factory function, and that value will get returned
   * instead of `undefined`.
   */
  getOrCreate(key: K, defaultFn?: (key: K) => V): V {
    if (super.has(key)) {
      // eslint-disable-next-line no-restricted-syntax
      return super.get(key)!;
    } else {
      const fn =
        defaultFn ??
        this.#defaultFn ??
        raise("DefaultMap used without a factory function");

      const value = fn(key);
      this.set(key, value);
      return value;
    }
  }
}
