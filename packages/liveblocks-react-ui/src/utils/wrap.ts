export function wrap(value: number, min: number, max: number) {
  const range = max - min;

  return range > 0 ? ((((value - min) % range) + range) % range) + min : 0;
}
