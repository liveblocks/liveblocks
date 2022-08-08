import seedrandom from "seedrandom";

export function shuffle<T>(array: T[], seed: string) {
  const random = seedrandom(seed);

  return [...array].sort(() => random() * 2 - 1);
}
