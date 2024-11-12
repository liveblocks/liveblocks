import type { Json } from "~/Json.js";
import type { Delta, OpId } from "./types.js";
import { chain, raise } from "./utils.js";

const TOMBSTONE = Symbol();

type TombStone = typeof TOMBSTONE;

/**
 * A stub is the public interface to mutate or read from the cache during
 * a mutation.
 */
export type Stub = Pick<
  LayeredCache,
  "has" | "get" | "getNumber" | "set" | "delete" | "keys" | "values" | "entries"
>;

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

  snapshot(): void {
    this.#layers.unshift(new Map());
  }

  *#iterDelta(): IterableIterator<[key: string, value: Json | undefined]> {
    const layer = this.#layers[0];
    if (!layer) return;

    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        yield [key, undefined];
      } else {
        yield [key, value];
      }
    }
  }

  /**
   * Computes a Delta since the last snapshot.
   */
  delta(opId: OpId): Delta {
    const deleted: string[] = [];

    const updated: [key: string, value: Json][] = [];
    for (const [key, value] of this.#iterDelta()) {
      if (value === undefined) {
        deleted.push(key);
      } else {
        updated.push([key, value]);
      }
    }

    return [opId, deleted, updated];
  }

  commit(): void {
    const layer = this.#layers.shift() ?? raise("No snapshot to commit");
    for (const [key, value] of layer) {
      if (value === TOMBSTONE) {
        this.delete(key);
      } else {
        this.set(key, value);
      }
    }
  }

  rollback(): void {
    this.#layers.shift() ?? raise("No snapshot to roll back");
  }
}
