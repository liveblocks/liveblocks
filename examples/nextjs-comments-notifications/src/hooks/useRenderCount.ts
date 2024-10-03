import { useRef } from "react";

export function useRenderCount() {
  const count = useRef(1);
  return count.current++;
}
