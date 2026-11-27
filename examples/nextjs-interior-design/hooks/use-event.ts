"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * A callback that keeps the same identity across renders but always runs the
 * latest version of `handler`. Lets event handlers read current props and
 * state without breaking the memoization of the components they're passed to.
 */
export function useEvent<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
) {
  const latest = useRef(handler);
  useLayoutEffect(() => {
    latest.current = handler;
  });
  return useCallback((...args: Args) => latest.current(...args), []);
}
