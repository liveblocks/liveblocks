import type { MutableRefObject, Ref, RefCallback } from "react";
import { useCallback } from "react";

function applyRef<T>(ref: Ref<T>, value: T) {
  if (value) {
    if (typeof ref === "function") {
      ref(value);
    } else if (ref && "current" in ref) {
      (ref as MutableRefObject<T>).current = value;
    }
  }
}

function mergeRefs<T>(value: T, ...refs: Ref<T>[]) {
  for (const ref of refs) {
    applyRef(ref, value);
  }
}

export function useRefs<T>(...refs: Ref<T>[]): RefCallback<T> {
  return useCallback((value: T) => mergeRefs(value, ...refs), [refs]);
}
