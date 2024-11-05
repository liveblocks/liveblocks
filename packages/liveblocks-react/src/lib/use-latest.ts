import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";

/**
 * Keeps a ref in sync with a given value that may or may not change on
 * every render.
 *
 * The purpose of this hook is to return a stable ref that can be passed
 * to a callback function so the callback can be registered but still can
 * access the latest value at a later point in time.
 */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
