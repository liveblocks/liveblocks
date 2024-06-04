import { useCallback, useRef, useState } from "react";

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
export function useInitial<T>(value: T): T {
  return useState(value)[0];
}

/**
 * Like `useInitial`, but if the provided value is a function instance, will
 * instead return a stable wrapper that _is_ a stable reference itself between
 * re-renders, but one which will always call the _latest_ provided callback
 * instance.
 */
export function useInitialUnlessFunction<T>(latestValue: T): T {
  const frozenValue = useInitial(latestValue);

  // Normally the Rules of Hooks™ dictate that you should not call hooks
  // conditionally. In this case, we're good here, because the same code path
  // will always be taken on every subsequent render here, because we've frozen
  // the value.
  if (typeof frozenValue === "function") {
    type Fn = T & Function;
    const ref = useRef(latestValue as Fn);
    const wrapper = ((...args: any[]) => ref.current(...args)) as any as Fn;
    return useCallback(wrapper, []);
  } else {
    return frozenValue;
  }
}
