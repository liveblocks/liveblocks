import type { JsonObject } from "./lib/Json.js";
import type { Lson, LsonObject } from "./lib/Lson.js";
import { isLiveStructure } from "./lib/Lson.js";
import type { Pool } from "./types.js";
import { mapValues, raise } from "./utils.js";

type Ctx = View | Local;

type View = {
  nodeId: string;
  pool: Pool;
  local?: never;
};

type Local = {
  local: LsonObject;
  nodeId?: never;
  pool?: never;
};

export class LiveObject {
  static PREFIX = "O" as const;

  #ctx: Ctx;

  constructor(data: LsonObject) {
    this.#ctx = { local: data ?? raise("Missing initial value") };
  }

  /** @internal */
  static _load(nodeId: string, pool: Pool): LiveObject {
    const l = new LiveObject({});
    l.#ctx = { nodeId, pool };
    return l;
  }

  // Commit current local initial state and write it into the pool
  /** @internal */
  public _attach(pool: Pool): string {
    if (this.#ctx.pool !== undefined) {
      if (this.#ctx.pool === pool) {
        throw new Error(
          `LiveObject already attached to this pool as ${this.#ctx.nodeId}`
        );
      } else {
        throw new Error("LiveObject already attached to different tree");
      }
    }

    const { local } = this.#ctx;
    const nodeId = pool.nextId(LiveObject.PREFIX);
    this.#ctx = { nodeId, pool };

    for (const [key, value] of Object.entries(local)) {
      if (value !== undefined) {
        this.#ctx.pool.setChild(this.#ctx.nodeId, key, value);
      }
    }

    return nodeId;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  get(key: string): Lson | undefined {
    if (this.#ctx.pool) {
      return this.#ctx.pool.getChild(this.#ctx.nodeId, key);
    } else {
      return this.#ctx.local[key];
    }
  }

  set(key: string, value: Lson): void {
    this.invalidate();
    if (this.#ctx.pool) {
      this.#ctx.pool.setChild(this.#ctx.nodeId, key, value);
    } else {
      this.#ctx.local[key] = value;
    }
  }

  delete(key: string): void {
    this.invalidate();
    if (this.#ctx.pool) {
      this.#ctx.pool.deleteChild(this.#ctx.nodeId, key);
    } else {
      delete this.#ctx.local[key];
    }
  }

  #_toImmutable(): JsonObject {
    if (this.#ctx.pool) {
      raise("Implement me");
    } else {
      return mapValues(this.#ctx.local, (value) =>
        isLiveStructure(value) ? value.toImmutable() : value
      );
    }
  }

  // --------------------------------------------------------------------
  // The following should be the same for all Live structures!
  // --------------------------------------------------------------------
  #_immCache: JsonObject | undefined;
  invalidate(): void {
    this.#_immCache = undefined;
    if (this.#ctx.pool) {
      // this.#ctx.pool.getParent(this.#ctx.nodeId).invalidate();
    } else {
      raise("Implement me");
    }
  }
  toImmutable(): JsonObject {
    if (this.#_immCache === undefined) {
      this.#_immCache = this.#_toImmutable();
    }
    return this.#_immCache;
  }

  /**
   * Proxy to make Live structure mutations look like normal JavaScript
   * mutations, for familiarity.
   */
  makeProxy(): JsonObject {
    const liveObj = this;
    return new Proxy(
      {} as JsonObject, // We're creating a proxy for a pojo here
      {
        get(_target, prop: string) {
          if (typeof prop === "symbol") raise("Getting symbols not supported");
          return liveObj.get(prop); // XXX TODO If this is a LiveObject, return its proxy
        },

        set(_target, prop, value) {
          if (typeof prop === "symbol") return false; // Throws TypeError
          if (typeof value === "object" && value !== null) {
            raise(`Cannot set property '${prop}': not a valid LSON value`);
          }
          liveObj.set(prop, value as Lson);
          return true;
        },

        deleteProperty(_target, prop) {
          if (typeof prop === "symbol") return false; // Throws TypeError
          liveObj.delete(prop);
          return true;
        },
      }
    );
  }
}
