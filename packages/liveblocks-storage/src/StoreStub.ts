import type { Json } from "~/Json.js";
import { chain } from "./utils.js";

// XXX This symbol should not be exported!
export const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

export class StoreStub {
  _local: Map<string, Json | TombStone>;
  _parentStub?: StoreStub;

  constructor(parentStub?: StoreStub) {
    this._local = new Map();
    this._parentStub = parentStub;
  }

  // ----------------------------------------------------
  // "Convenience" accessors to make implementing mutations easier
  // ----------------------------------------------------

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return typeof value === "number" ? value : undefined;
  }

  // ----------------------------------------------------
  // "Multi-layer" cache idea
  // ----------------------------------------------------

  has(key: string): boolean {
    return this._local.get(key) !== undefined;
  }

  get(key: string): Json | undefined {
    const value = this._local.get(key);
    if (value === TOMBSTONE) {
      return undefined;
    }
    return value !== undefined ? value : this._parentStub?.get(key);
  }

  set(key: string, value: Json): void {
    this._local.set(key, value);
  }

  delete(key: string): void {
    if (this._parentStub) {
      this._local.set(key, TOMBSTONE);
    } else {
      this._local.delete(key);
    }
  }

  *keys(): IterableIterator<string> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.keys()` for performance.
    for (const [key] of this.entries()) {
      yield key;
    }
  }

  *values(): IterableIterator<Json> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.values()` for performance.
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  *localChanges(): IterableIterator<[key: string, value: Json | TombStone]> {
    return this._local.entries();
  }

  *entries(): IterableIterator<[key: string, value: Json]> {
    // TODO Optimize! Since there can never be any TOMBSTONES in the root stub,
    // we can simply return `this._map.entries()` for performance.
    for (const key of new Set(
      chain(this._local.keys(), this._parentStub?.keys())
    )) {
      const value = this.get(key);
      if (value !== undefined) {
        yield [key, value];
      }
    }
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  startTransaction(): StoreStub {
    return new StoreStub(this);
  }

  commit(): void {
    const parent = this._parentStub;
    if (!parent) {
      throw new Error("Cannot commit in the root stub");
    }

    for (const [key, value] of this._local) {
      if (value === TOMBSTONE) {
        parent.delete(key);
      } else {
        parent.set(key, value);
      }
    }
  }
}
