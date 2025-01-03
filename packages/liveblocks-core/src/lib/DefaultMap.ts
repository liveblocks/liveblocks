/**
 * Like ES6 map, but takes a default factory function which will be used
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
  #_factoryFn?: (key: K) => V;

  /**
   * If the factory function is not provided to the constructor, it has to be
   * provided in each .getOrCreate() call individually.
   */
  constructor(
    factoryFn?: (key: K) => V,
    entries?: readonly (readonly [K, V])[] | null
  ) {
    super(entries);
    this.#_factoryFn = factoryFn;
  }

  get #factoryFn() {
    if (this.#_factoryFn === undefined) {
      throw new Error("DefaultMap used without a factory function");
    }
    return this.#_factoryFn;
  }

  /**
   * Gets the value at the given key, or creates it.
   *
   * Difference from normal Map: if the key does not exist, it will be created
   * on the fly using the factory function, and that value will get returned
   * instead of `undefined`.
   */
  getOrCreate(key: K, factoryFn?: (key: K) => V): V {
    let value = super.get(key);
    if (value === undefined) {
      value = factoryFn !== undefined ? factoryFn(key) : this.#factoryFn(key);
      this.set(key, value);
    }
    return value;
  }
}
