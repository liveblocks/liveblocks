import { useRef } from "react";

export function useRenderCount(): number {
  const count = useRef(0);
  return ++count.current;
}
