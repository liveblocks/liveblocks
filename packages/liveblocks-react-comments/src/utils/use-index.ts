import { useCallback, useEffect, useMemo, useState } from "react";

import { clamp } from "./clamp";
import { wrap } from "./wrap";

type Options = {
  wrap: boolean;
};

const defaultOptions: Options = {
  wrap: true,
};

export function useIndex(
  initial: number,
  length: number,
  options?: Partial<Options>
) {
  const { wrap: shouldWrap } = useMemo(() => {
    return {
      ...defaultOptions,
      ...options,
    };
  }, [options]);
  const transform = useMemo(() => (shouldWrap ? wrap : clamp), [shouldWrap]);
  const [index, setIndex] = useState(initial);

  useEffect(() => {
    setIndex((index) => clamp(index, 0, Math.max(length - 1, 0)));
  }, [length]);

  const previousIndex = useCallback(() => {
    setIndex((index) => transform(index - 1, 0, Math.max(length, 0)));
  }, [length, transform]);

  const nextIndex = useCallback(() => {
    setIndex((index) => transform(index + 1, 0, Math.max(length, 0)));
  }, [length, transform]);

  return [index, previousIndex, nextIndex, setIndex] as const;
}
