import type { Json } from "~/lib/Json.js";
import { NestedMap } from "~/lib/NestedMap.js";

import type { Delta, NodeId } from "./types.js";
import { chain, raise } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

const ROOT = "root" as NodeId;

export class LayeredCache {
  readonly #root: NestedMap<NodeId, string, Json>;
  readonly #layers: NestedMap<NodeId, string, Json | TombStone>[];

  constructor() {
    this.#root = new NestedMap();
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

  /**
   * Returns the number of items in the cache.
   * Unlike Map.size, LayeredCache.count() is a slow operation that requires
   * iterating over every entry.
   * XXX Make faster!
   */
  count(): number {
    let total = 0;
    for (const _ of this) {
      ++total;
    }
    return total;
  }

  has(key: string): boolean {
    for (const layer of this.#layers) {
      // XXX Lift "root" out
      const value = layer.get(ROOT, key);
      if (value === undefined) continue;
      return value !== TOMBSTONE;
    }
    // XXX Lift "root" out
    return this.#root.has(ROOT, key);
  }

  get(key: string): Json | undefined {
    for (const layer of this.#layers) {
      // XXX Lift "root" out
      const value = layer.get(ROOT, key);
      if (value === undefined) continue;
      if (value === TOMBSTONE) {
        return undefined;
      } else {
        return value;
      }
    }
    // XXX Lift "root" out
    return this.#root.get(ROOT, key);
  }

  set(key: string, value: Json): void {
    if (value === undefined) {
      this.delete(key);
    } else {
      const layer = this.#layers[0] ?? this.#root;
      // XXX Lift "root" out
      layer.set(ROOT, key, value);
    }
  }

  delete(key: string): boolean {
    const layer = this.#layers[0];
    if (layer) {
      // XXX Lift "root" out
      layer.set(ROOT, key, TOMBSTONE);
    } else {
      // XXX Lift "root" out
      this.#root.delete(ROOT, key);
    }
    // TODO Maybe make this return false if not deleted?
    return true;
  }

  *keys(): IterableIterator<string> {
    if (this.#layers.length === 0) {
      // XXX Lift "root" out
      yield* this.#root.keysAt(ROOT);
    } else {
      for (const [key] of this.entries()) {
        yield key;
      }
    }
  }

  *values(): IterableIterator<Json> {
    if (this.#layers.length === 0) {
      yield* this.#root.valuesAt(ROOT);
    } else {
      for (const [, value] of this.entries()) {
        yield value;
      }
    }
  }

  *entries(): IterableIterator<[key: string, value: Json]> {
    if (this.#layers.length === 0) {
      // XXX Lift "root" out + actually return ALL entries! Not just the root ones
      yield* this.#root.entriesAt(ROOT);
    } else {
      const keys = new Set(
        chain(
          // XXX Lift "root" out + actually return ALL entries! Not just the root ones
          this.#root.keysAt(ROOT),
          ...this.#layers.map((layer) => layer.keysAt(ROOT))
        )
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
    this.#layers.unshift(new NestedMap());
  }

  /**
   * Computes a Delta within the current transaction.
   */
  delta(): Delta {
    const layer = this.#layers[0] ?? raise("No transaction to get delta for");

    const deleted: Record<NodeId, string[]> = {};
    // For efficient packing, we'll codify all k,v pairs in a single array
    // [key1, value1, key2, value2, key3, value3, ...]
    const updated: Record<NodeId, Record<string, Json>> = {};

    for (const [nodeId, key, value] of layer) {
      if (value === TOMBSTONE) {
        if (!deleted[nodeId]) deleted[nodeId] = [];
        deleted[nodeId]!.push(key);
      } else {
        if (!updated[nodeId]) updated[nodeId] = {};
        updated[nodeId]![key] = value;
      }
    }

    return [deleted, updated];
  }

  commit(): void {
    const layer = this.#layers.shift() ?? raise("No transaction to commit");
    for (const [_nodeId, key, value] of layer) {
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
