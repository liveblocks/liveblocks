import type { Json } from "~/lib/Json.js";
import { NestedMap } from "~/lib/NestedMap.js";

import type { Delta, NodeId } from "./types.js";
import { raise } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

// const ROOT = "root" as NodeId;

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

  getNumber(nodeId: NodeId, key: string): number | undefined {
    const value = this.get(nodeId, key);
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

  has(nodeId: NodeId, key: string): boolean {
    for (const layer of this.#layers) {
      const value = layer.get(nodeId, key);
      if (value === undefined) continue;
      return value !== TOMBSTONE;
    }
    return this.#root.has(nodeId, key);
  }

  get(nodeId: NodeId, key: string): Json | undefined {
    for (const layer of this.#layers) {
      const value = layer.get(nodeId, key);
      if (value === undefined) continue;
      if (value === TOMBSTONE) {
        return undefined;
      } else {
        return value;
      }
    }
    return this.#root.get(nodeId, key);
  }

  set(nodeId: NodeId, key: string, value: Json): void {
    if (value === undefined) {
      this.delete(nodeId, key);
    } else {
      const layer = this.#layers[0] ?? this.#root;
      layer.set(nodeId, key, value);
    }
  }

  delete(nodeId: NodeId, key: string): boolean {
    const layer = this.#layers[0];
    if (layer) {
      layer.set(nodeId, key, TOMBSTONE);
    } else {
      this.#root.delete(nodeId, key);
    }
    // TODO Maybe make this return false if not deleted?
    return true;
  }

  *keys(): IterableIterator<[nodeId: NodeId, key: string]> {
    if (this.#layers.length === 0) {
      yield* this.#root.keys();
    } else {
      for (const [nodeId, key] of this.entries()) {
        yield [nodeId, key];
      }
    }
  }

  *entries(): IterableIterator<[nodeId: NodeId, key: string, value: Json]> {
    if (this.#layers.length === 0) {
      const arr = Array.from(this.#root);
      // yield* this.#root;
      yield* arr;
      return;
    }

    const seen = new Set<string>();

    function seenBefore(nodeId: NodeId, key: string): boolean {
      const fullKey = `${nodeId}:${key}`;
      if (seen.has(fullKey)) {
        return true;
      } else {
        seen.add(fullKey);
        return false;
      }
    }

    for (const layer of this.#layers) {
      for (const [nodeId, key, value] of layer) {
        if (!seenBefore(nodeId, key)) {
          if (value !== TOMBSTONE) {
            yield [nodeId, key, value];
          }
        }
      }
    }

    for (const [nodeId, key, value] of this.#root) {
      if (!seenBefore(nodeId, key)) {
        yield [nodeId, key, value];
      }
    }
  }

  *[Symbol.iterator](): IterableIterator<
    [nodeId: NodeId, key: string, value: Json]
  > {
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
    for (const [nodeId, key, value] of layer) {
      if (value === TOMBSTONE) {
        this.delete(nodeId, key);
      } else {
        this.set(nodeId, key, value);
      }
    }
  }

  rollback(): void {
    this.#layers.shift() ?? raise("No transaction to roll back");
  }

  // For convenience in unit tests only --------------------------------
  get data(): Record<string, Record<string, Json>> {
    const obj: Record<string, Record<string, Json>> = {};
    for (const [nid, key, value] of this) {
      (obj[nid] ??= {})[key] = value;
    }
    return obj;
  }
}
