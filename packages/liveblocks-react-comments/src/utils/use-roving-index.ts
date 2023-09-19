import { useCallback, useEffect, useState } from "react";

import { clamp } from "./clamp";
import { wrap } from "./wrap";

export function useRovingIndex(initial: number, length: number) {
  const [index, setIndex] = useState(initial);

  useEffect(() => {
    setIndex((index) => clamp(index, 0, Math.max(length - 1, 0)));
  }, [length]);

  const previousIndex = useCallback(() => {
    setIndex((index) => wrap(index - 1, 0, Math.max(length, 0)));
  }, [length]);

  const nextIndex = useCallback(() => {
    setIndex((index) => wrap(index + 1, 0, Math.max(length, 0)));
  }, [length]);

  return [index, previousIndex, nextIndex, setIndex] as const;
}
