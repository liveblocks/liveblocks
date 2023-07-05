import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { compactObject } from "../lib/utils";
import { ImmutableRef, merge } from "./ImmutableRef";

/**
 * Managed immutable cache for read-only-accessing an object that can be
 * patched.
 */
export class PatchableRef<T extends JsonObject> extends ImmutableRef<T> {
  /** @internal */
  private _data: Readonly<T>;

  constructor(data: T) {
    super();
    this._data = freeze(compactObject(data));
  }

  /** @internal */
  _toImmutable(): Readonly<T> {
    return this._data;
  }

  /**
   * Patches the current object.
   */
  patch(patch: Partial<T>): void {
    const oldMe = this._data;
    const newMe = merge(oldMe, patch);
    if (oldMe !== newMe) {
      this._data = freeze(newMe);
      this.invalidate();
    }
  }
}
