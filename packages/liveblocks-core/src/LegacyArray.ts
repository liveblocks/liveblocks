import { freeze } from "./lib/freeze";

// prettier-ignore
export type ReadonlyArrayWithLegacyMethods<T> =
  // Base type
  readonly T[]
  &
  // Legacy methods
  // (These will be removed in a future release.)
  {
    /**
     * @deprecated Prefer the normal .length property on arrays.
     */
    readonly count: number;
    /**
     * @deprecated Calling .toArray() is no longer needed
     */
    readonly toArray: () => readonly T[];
  };

export function asArrayWithLegacyMethods<T>(
  arr: readonly T[]
): ReadonlyArrayWithLegacyMethods<T> {
  // NOTE: We extend the array instance with custom `count` and `toArray()`
  // methods here. This is done for backward-compatible reasons. These APIs
  // will be deprecated in a future version.
  Object.defineProperty(arr, "count", {
    value: arr.length,
    enumerable: false,
  });
  Object.defineProperty(arr, "toArray", {
    value: () => arr,
    enumerable: false,
  });

  return freeze(arr) as ReadonlyArrayWithLegacyMethods<T>;
}
