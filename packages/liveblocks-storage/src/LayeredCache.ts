import type { Json } from "~/lib/Json.js";

import type { Delta, OpId } from "./types.js";
import { chain, raise } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

export class LayeredCache {
  #root: Map<string, Json>;
  #layers: Map<string, Json | TombStone>[];

  constructor() {
    this.#root = new Map();
    this.#layers = [];
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
    for (const layer of this.#layers) {
      const value = layer.get(key);
      if (value === undefined) continue;
      return value !== TOMBSTONE;
    }
    return this.#root.has(key);
  }

  get(key: string): Json | undefined {
    for (const layer of this.#layers) {
      const value = layer.get(key);
      if (value === undefined) continue;
      if (value === TOMBSTONE) {
        return undefined;
      } else {
        return value;
      }
    }
    return this.#root.get(key);
  }

  set(key: string, value: Json): void {
    if (value === undefined) {
      return this.delete(key);
    }

    const layer = this.#layers[0] ?? this.#root;
    layer.set(key, value);
  }

  delete(key: string): void {
    const layer = this.#layers[0];
    if (layer) {
      layer.set(key, TOMBSTONE);
    } else {
      this.#root.delete(key);
    }
  }

  *keys(): IterableIterator<string> {
    if (this.#layers.length === 0) {
      yield* this.#root.keys();
    } else {
      for (const [key] of this.entries()) {
        yield key;
      }
    }
  }

  *values(): IterableIterator<Json> {
    if (this.#layers.length === 0) {
      yield* this.#root.values();
    } else {
      for (const [, value] of this.entries()) {
        yield value;
      }
    }
  }

  *entries(): IterableIterator<[key: string, value: Json]> {
    if (this.#layers.length === 0) {
      yield* this.#root.entries();
    } else {
      const keys = new Set(
        chain(this.#root.keys(), ...this.#layers.map((layer) => layer.keys()))
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

  /**
   * Rolls back all transactions, and resets the LayeredCache to its initial,
   * empty, state.
   */
  reset(): void {
    this.#layers.length = 0;
    this.#root.clear();
  }

  startTransaction(): void {
    this.#layers.unshift(new Map());
  }

  /**
   * Computes a Delta within the current transaction.
   */
  delta(opId: OpId): Delta {
    const layer = this.#layers[0] ?? raise("No transaction to get delta for");

    const deleted: string[] = [];
    // For efficient packing, we'll codify all k,v pairs in a single array
    // [key1, value1, key2, value2, key3, value3, ...]
    const updated: (string | Json)[] = [];

    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        deleted.push(key);
      } else {
        updated.push(key);
        updated.push(value);
      }
    }

    return [opId, deleted, updated];
  }

  commit(): void {
    const layer = this.#layers.shift() ?? raise("No transaction to commit");
    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        this.delete(key);
      } else {
        this.set(key, value);
      }
    }
  }

  rollback(): void {
    this.#layers.shift() ?? raise("No transaction to roll back");
  }
}
