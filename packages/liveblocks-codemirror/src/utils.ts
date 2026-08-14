export function clamp(
  value: number,
  { min, max }: { min: number; max: number }
): number {
  return Math.max(min, Math.min(value, max));
}
