import type { Json } from "./lib/Json.js";
import type { Transaction } from "./types.js";

export class LiveObject {
  private _id = "root"; // XXX This should not be the permanent way to do this!
  private tx: Transaction; // XXX This should not be the permanent way to do this!

  constructor(tx: Transaction) {
    this._id = "root";
    this.tx = tx;
  }

  has(key: string): boolean {
    return this.tx.has(this._id, key);
  }

  get(key: string): Json | undefined {
    return this.tx.get(this._id, key);
  }

  keys(): IterableIterator<string> {
    return this.tx.keys(this._id);
  }

  // values(): IterableIterator<string> {
  //   return this.tx.valuesAt(this._id);
  // }

  set(key: string, value: Json): void {
    return this.tx.set(this._id, key, value);
  }

  delete(key: string): boolean {
    return this.tx.delete(this._id, key);
  }

  // ----------------------------------------------------
  // "Convenience" accessors to make implementing mutations easier
  // ----------------------------------------------------

  getNumber(key: string): number | undefined {
    const value = this.get(key);
    return typeof value === "number" ? value : undefined;
  }
}
