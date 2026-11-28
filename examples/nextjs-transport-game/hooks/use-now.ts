"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useEffect, useMemo, useState } from "react";
import { type Clock, gameTime, storedClock } from "@/game/clock";

// The game clock, which stands still while the game is paused
export function useClock(): Clock {
  const clock = useStorage((root) => root.clock);
  const pausedAt = useStorage((root) => root.pausedAt);
  const pausedFor = useStorage((root) => root.pausedFor);
  return useMemo(
    () => storedClock({ clock, pausedAt, pausedFor }),
    [clock, pausedAt, pausedFor]
  );
}

// The current time in the game, refreshed on an interval. Many numbers in
// the game (cargo waiting at a station, a town's population) aren't stored
// but worked out from the clock, so showing them live only takes
// re-rendering.
export function useNow(intervalMs = 1000) {
  const clock = useClock();
  const [wallTime, setWallTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(
      () => setWallTime(Date.now()),
      intervalMs
    );
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return gameTime(clock, wallTime);
}
