import { RefObject, useEffect } from "react";

export function useAutoFocus<T extends { focus: () => void }>(
  ref: RefObject<T>
) {
  useEffect(() => {
    setTimeout(() => {
      const { current } = ref;

      if (current) {
        current.focus();
      }
    }, 0);
  }, []);
}
