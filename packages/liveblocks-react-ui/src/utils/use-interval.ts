import { useEffect, useRef } from "react";

/**
 * Run a function at a given time interval.
 */
export function useInterval(
  callback: () => void | false,
  delay?: number | false
) {
  const latestCallback = useRef(callback);

  useEffect(() => {
    latestCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => {
      if (latestCallback.current() === false) {
        clearInterval(id);
      }
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}
