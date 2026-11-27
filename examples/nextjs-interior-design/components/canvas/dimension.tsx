import { add, distance, scale, sub } from "@/lib/geometry";
import type { Point } from "@/lib/plan";

/**
 * An architectural dimension line: a thin line running parallel to what it
 * measures, closed by a slash tick at each end, with the length written on
 * it. It's offset from `a`–`b` by `gap` along `normal`, so it sits outside a
 * wall rather than on it. Text and ticks keep their size on screen at any
 * zoom.
 */
export function Dimension({
  a,
  b,
  normal,
  gap,
  label,
  zoom,
  accent,
}: {
  a: Point;
  b: Point;
  normal: Point;
  gap: number;
  label: string;
  zoom: number;
  accent?: boolean;
}) {
  const length = distance(a, b);
  // Too short on screen for the label to fit.
  if (length * zoom < 44) {
    return null;
  }

  const dir = scale(sub(b, a), 1 / length);
  const start = add(a, scale(normal, gap));
  const end = add(b, scale(normal, gap));
  const tick = scale(add(dir, normal), 3.5 / zoom);
  const middle = scale(add(start, end), 0.5);

  // Keep the text upright, whichever way the wall runs.
  let angle = (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
  if (angle > 90 || angle <= -90) {
    angle += 180;
  }

  return (
    <g className="plan-dimension" data-accent={accent ? "" : undefined}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      {[start, end].map((point, index) => (
        <line
          key={index}
          x1={point.x - tick.x}
          y1={point.y - tick.y}
          x2={point.x + tick.x}
          y2={point.y + tick.y}
        />
      ))}
      <text
        transform={`translate(${middle.x} ${middle.y}) rotate(${angle})`}
        fontSize={10.5 / zoom}
        strokeWidth={5 / zoom}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  );
}
