import type { Lson, LsonObject } from "./lib/Lson.js";
import { isLiveStructure } from "./lib/Lson.js";
import type { Pool } from "./types.js";

export class LiveObject {
  #ctx:
    | {
        nodeId: string; // XXX This should not be the permanent way to do this!
        pool: Pool; // XXX This should not be the permanent way to do this!
        initialValue?: never;
      }
    | {
        initialValue: LsonObject;
        nodeId?: never;
        pool?: never;
      };

  constructor(initialValue: LsonObject) {
    this.#ctx = { initialValue };
  }

  static loadRoot(pool: Pool): LiveObject {
    return LiveObject._load("root", pool);
  }

  static _load(nodeId: string, pool: Pool): LiveObject {
    const l = new LiveObject({});
    l.#ctx = { nodeId, pool };
    return l;
  }

  // Commit current local initial state and write it into the pool
  private _attach(pool: Pool): string {
    if (this.#ctx.pool) {
      throw new Error(`LiveObject is already attached as ${this.#ctx.nodeId}`);
    }

    const { initialValue } = this.#ctx;
    const nodeId = pool.nextId();
    this.#ctx = { nodeId, pool };

    for (const [key, lsonValue] of Object.entries(initialValue)) {
      let value = lsonValue;
      if (value !== undefined) {
        if (isLiveStructure(value)) {
          value = { $ref: value._attach(pool) };
        }
        this.#ctx.pool.set(this.#ctx.nodeId, key, value);
      }
    }

    return nodeId;
  }

  has(key: string): boolean {
    if (this.#ctx.pool) {
      return this.#ctx.pool.has(this.#ctx.nodeId, key);
    } else {
      return this.#ctx.initialValue[key] !== undefined;
    }
  }

  get(key: string): Lson | undefined {
    if (this.#ctx.pool) {
      return this.#ctx.pool.get(this.#ctx.nodeId, key);
    } else {
      return this.#ctx.initialValue[key];
    }
  }

  set(key: string, value: Lson): void {
    if (this.#ctx.pool) {
      if (isLiveStructure(value)) {
        value = { $ref: value._attach(this.#ctx.pool) };
      }
      this.#ctx.pool.set(this.#ctx.nodeId, key, value);
    } else {
      this.#ctx.initialValue[key] = value;
    }
  }

  delete(key: string): void {
    if (this.#ctx.pool) {
      this.#ctx.pool.delete(this.#ctx.nodeId, key);
    } else {
      delete this.#ctx.initialValue[key];
    }
  }
}
