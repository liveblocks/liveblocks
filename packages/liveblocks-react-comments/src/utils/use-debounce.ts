import { useEffect, useRef, useState } from "react";

const DEFAULT_DELAY = 500;

export function useDebounce<T>(
  value: T,
  delay: number | false = DEFAULT_DELAY
): T {
  const timeout = useRef<number>();
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (delay === false) {
      return;
    }

    if (timeout.current === undefined) {
      setDebouncedValue(value);
    }

    timeout.current = window.setTimeout(() => {
      setDebouncedValue(value);
      timeout.current = undefined;
    }, delay);

    return () => {
      window.clearTimeout(timeout.current);
    };
  }, [value, delay]);

  return debouncedValue;
}
