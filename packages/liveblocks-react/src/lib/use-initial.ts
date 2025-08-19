import { useCallback, useMemo } from "react";

import { useLatest } from "./use-latest";

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
export function useInitial<T>(value: T, roomId?: string): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => value, [roomId]);
}

/**
 * Like `useInitial`, but if the provided value is a function instance, will
 * instead return a stable wrapper that _is_ a stable reference itself between
 * re-renders, but one which will always call the _latest_ provided callback
 * instance.
 */
export function useInitialUnlessFunction<T>(
  latestValue: T,
  roomId?: string
): T {
  const frozenValue = useInitial(latestValue, roomId);

  type Fn = T & ((...args: unknown[]) => unknown);
  const ref = useLatest(latestValue as Fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wrapper = useCallback(
    ((...args: unknown[]) => ref.current(...args)) as Fn,
    [ref]
  );

  // Return the wrapper only if the frozen value is a function
  if (typeof frozenValue === "function") {
    return wrapper;
  } else {
    return frozenValue;
  }
}
