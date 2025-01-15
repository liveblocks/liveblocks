import type { AsyncError, AsyncLoading, AsyncSuccess } from "@liveblocks/core";

// TODO Maybe move these into @liveblocks/core if they are useful?

export const ASYNC_LOADING: AsyncLoading = Object.freeze({ isLoading: true });

export const ASYNC_ERR = (error: Error): AsyncError =>
  Object.freeze({ isLoading: false, error });

export function ASYNC_OK<T>(data: T): AsyncSuccess<T>;
export function ASYNC_OK<T, F extends string>(
  field: F,
  data: T
): AsyncSuccess<T, F>;
export function ASYNC_OK<T, F extends string>(
  fieldOrData: F | T,
  data?: T
): AsyncSuccess<T, F> {
  if (arguments.length === 1) {
    // @ts-expect-error too dynamic to type
    return Object.freeze({ isLoading: false, data: fieldOrData });
  } else {
    // @ts-expect-error too dynamic to type
    return Object.freeze({ isLoading: false, [fieldOrData as F]: data });
  }
}
