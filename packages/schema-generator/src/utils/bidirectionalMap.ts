export class BidirectionalMap<TKey, TValue> implements Map<TKey, TValue> {
  private _map: Map<TKey, TValue> = new Map();
  private _reverseMap: Map<TValue, TKey> = new Map();

  clear(): void {
    this._map.clear();
    this._reverseMap.clear();
  }

  delete(key: TKey): boolean {
    if (!this._map.has(key)) {
      return false;
    }

    const value = this._map.get(key)!;
    this._map.delete(key);
    this._reverseMap.delete(value);
    return true;
  }

  deleteValue(value: TValue): boolean {
    if (!this._reverseMap.has(value)) {
      return false;
    }

    const key = this._reverseMap.get(value)!;
    this._reverseMap.delete(value);
    this._map.delete(key);
    return true;
  }

  forEach(
    callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
    thisArg?: any
  ): void {
    this._map.forEach(callbackfn, thisArg);
  }

  get(key: TKey): TValue | undefined {
    return this._map.get(key);
  }

  getKey(value: TValue): TKey | undefined {
    return this._reverseMap.get(value);
  }

  has(key: TKey): boolean {
    return this._map.has(key);
  }

  hasValue(value: TValue): boolean {
    return this._reverseMap.has(value);
  }

  set(key: TKey, value: TValue): this {
    const hasExistingKey = this._map.has(key);
    const hasExistingValue = this._reverseMap.has(value);

    if (!hasExistingKey && hasExistingValue) {
      throw new Error(
        `Value ${JSON.stringify(
          value
        )} already exists in the map referenced by a different key ${JSON.stringify(
          key
        )}`
      );
    }

    this._map.set(key, value);
    this._reverseMap.set(value, key);
    return this;
  }

  entries(): IterableIterator<[TKey, TValue]> {
    return this._map.entries();
  }

  keys(): IterableIterator<TKey> {
    return this._map.keys();
  }

  values(): IterableIterator<TValue> {
    return this._reverseMap.keys();
  }

  [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    return this._map[Symbol.iterator]();
  }

  [Symbol.toStringTag]: "BidirectionalMap";

  get size() {
    return this._map.size;
  }
}
