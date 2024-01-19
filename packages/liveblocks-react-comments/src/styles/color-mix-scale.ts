/**
 * Generates a scale of [100...900] colors based on a contrast
 * variable, which indicates the lowest percentage of the scale.
 *
 *   ╔═════════╗                                  ╔═════════╗
 *   ║  from   ║                                  ║   to    ║
 *   ╚═════════╝                                  ╚═════════╝
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─●───┬───┬───┬───┬───┬───┬───┬───┬───●
 *       ┌─────────┴───┴───┤   │   │   │   │   │   │
 *       │ contrast = 15%  │   │   │   │   │   │   │
 *       └─────────┬───┬───┤   │   │   │   │   │   │
 *                 ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇
 *                100 200 300 400 500 600 700 800 900
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─ ─ ─ ─ ─ ●──┬──┬──┬──┬──┬──┬──┬──┬──●
 *                 ┌────────┴──┴──┴──┤  │  │  │  │  │
 *                 │ contrast = 40%  │  │  │  │  │  │
 *                 └────────┬──┬──┬──┤  │  │  │  │  │
 *                          ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇
 */
export function colorMixScale(
  from: string,
  to: string,
  contrast: string,
  increment: string
) {
  const index = Math.max(Math.floor(Number(increment) / 100) - 1, 0);
  const percentage = index
    ? `calc(100% - (${contrast} + ${index} * ((100% - ${contrast}) / 9)))`
    : `calc(100% - ${contrast})`;

  return `color-mix(in srgb, ${to}, ${from} ${percentage})`;
}
