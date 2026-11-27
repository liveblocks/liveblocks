"use client";

import { useEffect, useState } from "react";

// The current time, refreshed on an interval. Many numbers in the game
// (cargo waiting at a station, a town's population) aren't stored but worked
// out from the clock, so showing them live only takes re-rendering.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}
