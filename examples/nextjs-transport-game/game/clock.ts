// The game has its own clock, which stands still while the game is paused
// and runs ahead while it is fast-forwarded. Every time that is kept in
// Storage (when a vehicle left, when a town was last looked at, when the map
// started) is a time on this clock, and so is every `now` the game logic is
// given. Vehicles, cargo and towns are all worked out from it, so changing
// the speed of the game only takes writing down when it happened: nothing
// else in Storage changes, for however long a pause lasts.
export type Clock = {
  // When the speed last changed, on the player's own clock
  at: number;
  // What time it was in the game at that moment
  time: number;
  // How fast the game has been running since: game time per real time
  speed: number;
};

export type Speed = "paused" | "play" | "fast";

export const SPEEDS: { [speed in Speed]: number } = {
  paused: 0,
  play: 1,
  fast: 4,
};

export function gameTime(clock: Clock, wallTime: number) {
  // Players' own clocks differ a little: never before the speed changed
  return clock.time + Math.max(0, wallTime - clock.at) * clock.speed;
}

export function speedOf(clock: Clock): Speed {
  return clock.speed === 0 ? "paused" : clock.speed > 1 ? "fast" : "play";
}

// The same clock from now on running at another speed
export function withSpeed(clock: Clock, speed: Speed, wallTime: number): Clock {
  return {
    at: wallTime,
    time: gameTime(clock, wallTime),
    speed: SPEEDS[speed],
  };
}

// The clock as kept in Storage. Rooms from before the game could be
// fast-forwarded only kept when it was paused, and for how long before that.
export function storedClock(stored: {
  clock?: Clock;
  pausedAt?: number | null;
  pausedFor?: number;
}): Clock {
  if (stored.clock) {
    return stored.clock;
  }
  const pausedAt = stored.pausedAt ?? null;
  const at = pausedAt ?? 0;
  return {
    at,
    time: at - (stored.pausedFor ?? 0),
    speed: pausedAt === null ? SPEEDS.play : SPEEDS.paused,
  };
}
