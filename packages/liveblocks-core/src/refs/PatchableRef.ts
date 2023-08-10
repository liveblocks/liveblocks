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
    const oldData = this._data;
    const newData = merge(oldData, patch);
    if (oldData !== newData) {
      this._data = freeze(newData);
      this.invalidate();
    }
  }
}
