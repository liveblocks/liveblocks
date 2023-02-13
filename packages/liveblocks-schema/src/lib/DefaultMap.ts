/**
 * Like ES6 map, but takes a default factory function which will be used
 * to create entries for missing keys on the fly.
 *
 * Useful for code like:
 *
 *   const map = new DefaultMap(() => []);
 *   map.get('foo').push('hello');
 *   map.get('foo').push('world');
 *   map.get('foo')
 *   // ['hello', 'world']
 *
 */
export default class DefaultMap<K, V> extends Map<K, V> {
  #_factoryFn?: (key: K) => V;

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

  /**
   * Sets the value at the given key.
   *
   * Difference from normal Map: if the second arg is a function, it will be
   * called with the current value as its argument and the return value will be
   * set instead. If the returned value is `undefined`, it will remove the key,
   * meaning the next time the key is accessed it will get re-created by the
   * factory function.
   */
  set(key: K, value: V): this;
  set(key: K, valueFn: (prev: V) => V | undefined): this;
  set(key: K, value: V | ((prev: V) => V | undefined)): this {
    if (typeof value === "function") {
      value = (value as (prev: V) => V)(this.get(key) ?? this.#factoryFn(key));
    }

    if (value === undefined) {
      super.delete(key);
      return this;
    } else {
      return super.set(key, value);
    }
  }
}
