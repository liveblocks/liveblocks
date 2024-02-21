/**
 * Generates a scale of [50,100...900] colors based on a contrast
 * variable, which indicates the lowest percentage of the scale.
 *
 *   ╔═════════╗                                  ╔═════════╗
 *   ║  from   ║                                  ║   to    ║
 *   ╚═════════╝                                  ╚═════════╝
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─●───┬───┬───┬───┬───┬───┬───┬───┬───●
 *       ┌───────┴─┴───┴───┤   │   │   │   │   │   │
 *       │ contrast = 15%  │   │   │   │   │   │   │
 *       └───────┬─┬───┬───┤   │   │   │   │   │   │
 *               ◇ ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇
 *             50 100 200 300 400 500 600 700 800 900
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─ ─ ─ ─ ─ ●──┬──┬──┬──┬──┬──┬──┬──┬──●
 *                 ┌──────┴─┴──┴──┴──┤  │  │  │  │  │
 *                 │ contrast = 40%  │  │  │  │  │  │
 *                 └──────┬─┬──┬──┬──┤  │  │  │  │  │
 *                        ◇ ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇
 */
export function colorMixScale(
  from: string,
  to: string,
  contrast: string,
  increment: string
) {
  const unit = `(100% - ${contrast}) / 9`;
  let percentage: string;

  if (Number(increment) === 50) {
    percentage = `calc(100% - ${contrast} + (${unit}) / 2)`;
  } else {
    const index = Math.floor(Number(increment) / 100) - 1;

    percentage = `calc(100% - ${
      index === 0
        ? contrast
        : `(${contrast} + ${index === 1 ? unit : `${index} * (${unit})`})`
    })`;
  }

  return `color-mix(in srgb, ${to}, ${from} ${percentage})`;
}
