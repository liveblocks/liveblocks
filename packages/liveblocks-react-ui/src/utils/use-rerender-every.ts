import { useEffect, useState } from "react";

/**
 * Forces a component rerender at regular intervals. Set intervalMs to null to
 * stop rerendering. Useful for components that need to update time-based
 * displays.
 */
export function useRerenderEvery(intervalMs: number | null): void {
  const [_, setCount] = useState(0);
  useEffect(() => {
    if (intervalMs === null) return;
    const interval = setInterval(() => setCount((c) => c + 1), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
}
