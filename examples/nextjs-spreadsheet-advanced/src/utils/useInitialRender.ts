import { useRef } from "react";

export function useInitialRender() {
  const isInitial = useRef(true);

  if (isInitial.current) {
    isInitial.current = false;

    return true;
  }

  return isInitial.current;
}
