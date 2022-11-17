import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";

export function useLatest<T>(value: T) {
  const ref: MutableRefObject<T> = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
