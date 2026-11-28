// The game has its own clock, which stands still while the game is paused.
// Every time that is kept in Storage (when a vehicle left, when a town was
// last looked at, when the map started) is a time on this clock, and so is
// every `now` the game logic is given. Vehicles, cargo and towns are all
// worked out from it, so pausing only takes writing down when it happened:
// nothing else in Storage changes, for however long the pause lasts.
export type Clock = {
  // When the game was paused, on the player's own clock, or null if it runs
  pausedAt: number | null;
  // How long it has been paused in total, before that
  pausedFor: number;
};

export function gameTime(clock: Clock, wallTime: number) {
  return (clock.pausedAt ?? wallTime) - clock.pausedFor;
}
