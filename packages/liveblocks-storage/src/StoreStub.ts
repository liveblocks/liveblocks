import type { Json } from "~/Json.js";
import { chain } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

export class StoreStub {
  _root: Map<string, Json>;
  _layers: Map<string, Json | TombStone>[];

  constructor() {
    this._root = new Map();
    this._layers = [];
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
    for (const layer of this._layers) {
      const value = layer.get(key);
      if (value === undefined) continue;
      return value !== TOMBSTONE;
    }
    return this._root.has(key);
  }

  get(key: string): Json | undefined {
    for (const layer of this._layers) {
      const value = layer.get(key);
      if (value === undefined) continue;
      if (value === TOMBSTONE) {
        return undefined;
      } else {
        return value;
      }
    }
    return this._root.get(key);
  }

  set(key: string, value: Json): void {
    if (value === undefined) {
      return this.delete(key);
    }

    const layer = this._layers[0] ?? this._root;
    layer.set(key, value);
  }

  delete(key: string): void {
    const layer = this._layers[0];
    if (layer) {
      layer.set(key, TOMBSTONE);
    } else {
      this._root.delete(key);
    }
  }

  *keys(): IterableIterator<string> {
    if (this._layers.length === 0) {
      yield* this._root.keys();
    } else {
      for (const [key] of this.entries()) {
        yield key;
      }
    }
  }

  *values(): IterableIterator<Json> {
    if (this._layers.length === 0) {
      yield* this._root.values();
    } else {
      for (const [, value] of this.entries()) {
        yield value;
      }
    }
  }

  *entries(): IterableIterator<[key: string, value: Json]> {
    if (this._layers.length === 0) {
      yield* this._root.entries();
    } else {
      const keys = new Set(
        chain(this._root.keys(), ...this._layers.map((layer) => layer.keys()))
      );
      for (const key of keys) {
        const value = this.get(key);
        if (value !== undefined) {
          yield [key, value];
        }
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<[key: string, value: Json]> {
    yield* this.entries();
  }

  // ----------------------------------------------------
  // Transaction API
  // ----------------------------------------------------

  snapshot(): void {
    this._layers.unshift(new Map());
  }

  /**
   * Iterators over all the keys since the last snapshot.
   */
  *diff(): IterableIterator<[key: string, value: Json | undefined]> {
    const layer = this._layers[0];
    if (!layer) return;

    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        yield [key, undefined];
      } else {
        yield [key, value];
      }
    }
  }

  commit(): void {
    const layer = this._layers.shift();
    if (!layer) {
      throw new Error("No snapshot to commit");
    }

    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        this.delete(key);
      } else {
        this.set(key, value);
      }
    }
  }

  rollback(): void {
    const layer = this._layers.shift();
    if (!layer) {
      throw new Error("No snapshot to roll back");
    }
  }
}
