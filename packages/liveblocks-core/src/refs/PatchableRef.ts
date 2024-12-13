import { freeze } from "../lib/freeze";
import type { JsonObject } from "../lib/Json";
import { compactObject } from "../lib/utils";
import { ImmutableRef, merge } from "./ImmutableRef";

/**
 * Managed immutable cache for read-only-accessing an object that can be
 * patched.
 */
// XXX Remove when unused now
export class PatchableRef<J extends JsonObject> extends ImmutableRef<J> {
  /** @internal */
  private _data: Readonly<J>;

  constructor(data: J) {
    super();
    this._data = freeze(compactObject(data));
  }

  /** @internal */
  _toImmutable(): Readonly<J> {
    return this._data;
  }

  /**
   * Patches the current object.
   */
  patch(patch: Partial<J>): void {
    const oldData = this._data;
    const newData = merge(oldData, patch);
    if (oldData !== newData) {
      this._data = freeze(newData);
      this.notify();
    }
  }
}
