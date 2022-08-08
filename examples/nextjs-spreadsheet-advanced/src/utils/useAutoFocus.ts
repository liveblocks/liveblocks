import { RefObject, useEffect } from "react";

export function useAutoFocus<T extends { focus: () => void }>(
  ref: RefObject<T>,
  callback?: (element: T) => void
) {
  useEffect(() => {
    setTimeout(() => {
      const { current } = ref;

      if (current) {
        current.focus();
        callback?.(current);
      }
    }, 0);
  }, []);
}
