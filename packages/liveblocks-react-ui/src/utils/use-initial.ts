import { useState } from "react";

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
export function useInitial<T>(value: T | (() => T)): T {
  const [initialValue] = useState(value);

  return initialValue;
}
