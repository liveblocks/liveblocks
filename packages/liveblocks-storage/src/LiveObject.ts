import type { Json } from "./lib/Json.js";
import type { Transaction } from "./types.js";

export class LiveObject {
  #id = "root"; // XXX This should not be the permanent way to do this!
  #tx: Transaction; // XXX This should not be the permanent way to do this!

  constructor(tx: Transaction) {
    this.#id = "root";
    this.#tx = tx;
  }

  has(key: string): boolean {
    return this.#tx.has(this.#id, key);
  }

  get(key: string): Json | undefined {
    return this.#tx.get(this.#id, key);
  }

  set(key: string, value: Json): void {
    return this.#tx.set(this.#id, key, value);
  }

  delete(key: string): boolean {
    return this.#tx.delete(this.#id, key);
  }
}
