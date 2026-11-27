import type { ReactNode } from "react";
import type { FurnitureType } from "@/lib/catalog";
import { clamp } from "@/lib/geometry";

/**
 * Architectural plan symbols: every piece of furniture seen from above, the
 * way it's drawn on a floor plan. Each symbol is drawn for the exact width
 * and depth it's given (in centimeters, centered on the origin, back of the
 * piece at the top) rather than stretched, so cushions, burners and basins
 * keep their proportions when a piece is resized.
 *
 * Looks come from `.plan-symbol` in `globals.css`: white shapes with an ink
 * outline. `detail` is a lighter inner line, `soft` a light gray fill, and
 * `solid` an ink fill.
 */
export function FurnitureSymbol({
  type,
  width,
  depth,
}: {
  type: FurnitureType;
  width: number;
  depth: number;
}) {
  // Storage can hold a type this version doesn't know (written by a newer
  // version of the app, say); those are drawn as a plain box.
  const draw: ((w: number, d: number) => ReactNode) | undefined = SYMBOLS[type];
  return (
    <g className="plan-symbol">
      {draw ? (
        draw(width, depth)
      ) : (
        <rect x={-width / 2} y={-depth / 2} width={width} height={depth} />
      )}
    </g>
  );
}

function Box({
  x,
  y,
  w,
  h,
  r = 0,
  className,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  className?: string;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={Math.max(0, w)}
      height={Math.max(0, h)}
      rx={r}
      className={className}
    />
  );
}

// A dining chair centered on (x, y), its back turned `rotation` degrees.
function Seat({
  x,
  y,
  rotation,
  size = 42,
}: {
  x: number;
  y: number;
  rotation: number;
  size?: number;
}) {
  const half = size / 2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
      <Box x={-half} y={-half} w={size} h={size} r={6} />
      <Box x={-half} y={-half} w={size} h={6} r={3} className="soft" />
    </g>
  );
}

function sofa(w: number, d: number, seats: number) {
  const left = -w / 2;
  const top = -d / 2;
  const arm = clamp(w * 0.09, 8, 22);
  const back = clamp(d * 0.26, 10, 26);
  const seat = (w - arm * 2) / seats;
  return (
    <>
      <Box x={left} y={top} w={w} h={d} r={7} className="soft" />
      {Array.from({ length: seats }, (_, index) => (
        <Box
          key={index}
          x={left + arm + seat * index}
          y={top + back}
          w={seat}
          h={d - back - 2}
          r={5}
        />
      ))}
    </>
  );
}

function sectional(w: number, d: number) {
  const left = -w / 2;
  const top = -d / 2;
  const right = w / 2;
  const bottom = d / 2;
  // Depth of the two runs: the long one along the back, the chaise on the
  // left.
  const run = clamp(Math.min(w, d) * 0.52, 30, 100);
  const back = clamp(run * 0.24, 8, 24);
  const arm = clamp(run * 0.2, 8, 20);
  const seats = Math.max(1, Math.round((w - run - arm) / 75));
  const seat = (w - run - arm) / seats;
  return (
    <>
      <path
        className="soft"
        d={`M ${left} ${top} H ${right} V ${top + run} H ${left + run} V ${bottom} H ${left} Z`}
      />
      <Box
        x={left + back}
        y={top + back}
        w={run - back}
        h={run - back - 2}
        r={5}
      />
      <Box
        x={left + back}
        y={top + run}
        w={run - back - 2}
        h={d - run - 2}
        r={5}
      />
      {Array.from({ length: seats }, (_, index) => (
        <Box
          key={index}
          x={left + run + seat * index}
          y={top + back}
          w={seat}
          h={run - back - 2}
          r={5}
        />
      ))}
    </>
  );
}

function bed(w: number, d: number, pillows: number) {
  const left = -w / 2;
  const top = -d / 2;
  const gap = 8;
  const pillowWidth = (w - gap * (pillows + 1)) / pillows;
  const pillowDepth = clamp(d * 0.17, 12, 36);
  const duvet = top + 12 + pillowDepth + 8;
  return (
    <>
      <Box x={left} y={top} w={w} h={d} r={5} />
      <Box x={left} y={top} w={w} h={7} r={3} className="soft" />
      {Array.from({ length: pillows }, (_, index) => (
        <Box
          key={index}
          x={left + gap + (pillowWidth + gap) * index}
          y={top + 12}
          w={pillowWidth}
          h={pillowDepth}
          r={6}
        />
      ))}
      <Box x={left} y={duvet} w={w} h={d / 2 - duvet} r={5} />
      <line
        className="detail"
        x1={left}
        y1={duvet + 14}
        x2={w / 2}
        y2={duvet + 14}
      />
    </>
  );
}

function divisions(w: number, d: number, every: number) {
  const count = Math.max(2, Math.round(w / every));
  return Array.from({ length: count - 1 }, (_, index) => {
    const x = -w / 2 + (w * (index + 1)) / count;
    return (
      <line
        key={index}
        className="detail"
        x1={x}
        y1={-d / 2}
        x2={x}
        y2={d / 2}
      />
    );
  });
}

function vanity(w: number, d: number) {
  const basins = w >= 110 ? 2 : 1;
  return (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      {Array.from({ length: basins }, (_, index) => {
        const x = -w / 2 + (w * (index + 0.5)) / basins;
        return (
          <g key={index}>
            <ellipse
              cx={x}
              cy={d * 0.06}
              rx={Math.min((w / basins) * 0.34, 24)}
              ry={d * 0.3}
            />
            <circle className="solid" cx={x} cy={-d / 2 + 6} r={2} />
          </g>
        );
      })}
    </>
  );
}

const SYMBOLS: Record<FurnitureType, (w: number, d: number) => ReactNode> = {
  sofa: (w, d) => sofa(w, d, 3),
  loveseat: (w, d) => sofa(w, d, 2),
  armchair: (w, d) => sofa(w, d, 1),
  sectional,

  "coffee-table": (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={4} />
      <Box
        x={-w / 2 + 5}
        y={-d / 2 + 5}
        w={w - 10}
        h={d - 10}
        r={2}
        className="detail"
      />
    </>
  ),

  "side-table": (w, d) => (
    <>
      <ellipse rx={w / 2} ry={d / 2} />
      <ellipse rx={w * 0.3} ry={d * 0.3} className="detail" />
    </>
  ),

  "tv-unit": (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      <Box x={-w * 0.32} y={-2} w={w * 0.64} h={4} r={1} className="solid" />
    </>
  ),

  bookshelf: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
      {divisions(w, d, 30)}
    </>
  ),

  "bed-double": (w, d) => bed(w, d, 2),
  "bed-single": (w, d) => bed(w, d, 1),

  nightstand: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      <circle r={Math.min(w, d) * 0.22} className="detail" />
    </>
  ),

  wardrobe: (w, d) => {
    const hangers = Math.max(1, Math.floor((w - 16) / 14));
    const spacing = (w - 16) / hangers;
    return (
      <>
        <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
        <line className="detail" x1={-w / 2 + 5} y1={0} x2={w / 2 - 5} y2={0} />
        {Array.from({ length: hangers }, (_, index) => {
          const x = -w / 2 + 8 + spacing * (index + 0.5);
          return (
            <line
              key={index}
              className="detail"
              x1={x - 3}
              y1={-d * 0.3}
              x2={x + 3}
              y2={d * 0.3}
            />
          );
        })}
      </>
    );
  },

  dresser: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      {divisions(w, d, 40)}
      <line
        className="detail"
        x1={-w / 2}
        y1={d / 2 - 4}
        x2={w / 2}
        y2={d / 2 - 4}
      />
    </>
  ),

  counter: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
      <line
        className="detail"
        x1={-w / 2}
        y1={d / 2 - 4}
        x2={w / 2}
        y2={d / 2 - 4}
      />
    </>
  ),

  sink: (w, d) => {
    const basins = w >= 100 ? 2 : 1;
    const basin = (w - 16 - (basins - 1) * 6) / basins;
    return (
      <>
        <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
        {Array.from({ length: basins }, (_, index) => {
          const x = -w / 2 + 8 + (basin + 6) * index;
          return (
            <g key={index}>
              <Box x={x} y={-d / 2 + 13} w={basin} h={d - 22} r={6} />
              <circle
                className="detail"
                cx={x + basin / 2}
                cy={-d / 2 + 13 + (d - 22) / 2}
                r={2.5}
              />
            </g>
          );
        })}
        <circle className="solid" cx={0} cy={-d / 2 + 6.5} r={2.5} />
        <line x1={0} y1={-d / 2 + 6.5} x2={0} y2={-d / 2 + 18} />
      </>
    );
  },

  stove: (w, d) => {
    const burner = Math.min(w, d) * 0.13;
    return (
      <>
        <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
        {[-1, 1].flatMap((column) =>
          [-1, 1].map((row) => (
            <g key={`${column}${row}`}>
              <circle
                cx={column * w * 0.22}
                cy={row * d * 0.2 - d * 0.04}
                r={burner}
              />
              <circle
                className="detail"
                cx={column * w * 0.22}
                cy={row * d * 0.2 - d * 0.04}
                r={burner * 0.5}
              />
            </g>
          ))
        )}
        <line
          className="detail"
          x1={-w / 2}
          y1={d / 2 - 6}
          x2={w / 2}
          y2={d / 2 - 6}
        />
      </>
    );
  },

  fridge: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      <Box
        x={-w / 2 + 5}
        y={-d / 2 + 5}
        w={w - 10}
        h={d - 18}
        r={1}
        className="detail"
      />
      <line x1={-w / 2} y1={d / 2 - 7} x2={w / 2} y2={d / 2 - 7} />
      <line
        x1={-w / 2 + 8}
        y1={d / 2 - 3.5}
        x2={-w / 2 + Math.min(22, w * 0.4)}
        y2={d / 2 - 3.5}
      />
    </>
  ),

  island: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      <Box
        x={-w / 2 + 6}
        y={-d / 2 + 6}
        w={w - 12}
        h={d - 12}
        r={1}
        className="detail"
      />
    </>
  ),

  "bar-stool": (w, d) => (
    <>
      <ellipse rx={w / 2} ry={d / 2} />
      <ellipse rx={w * 0.28} ry={d * 0.28} className="detail" />
    </>
  ),

  washer: (w, d) => {
    const drum = Math.min(w, d) * 0.3;
    return (
      <>
        <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
        <line
          className="detail"
          x1={-w / 2}
          y1={-d / 2 + 8}
          x2={w / 2}
          y2={-d / 2 + 8}
        />
        <circle cy={d * 0.07} r={drum} />
        <circle cy={d * 0.07} r={drum * 0.62} className="detail" />
      </>
    );
  },

  "dining-table": (w, d) => {
    const seats = Math.max(1, Math.round((w - 10) / 58));
    const spacing = w / seats;
    const size = Math.min(42, spacing - 4, d * 0.4);
    const overhang = Math.min(28, d * 0.2);
    return (
      <>
        {Array.from({ length: seats }, (_, index) => {
          const x = -w / 2 + spacing * (index + 0.5);
          return (
            <g key={index}>
              <Seat x={x} y={-d / 2 + size / 2} rotation={0} size={size} />
              <Seat x={x} y={d / 2 - size / 2} rotation={180} size={size} />
            </g>
          );
        })}
        <Box
          x={-w / 2}
          y={-d / 2 + overhang}
          w={w}
          h={d - overhang * 2}
          r={3}
        />
      </>
    );
  },

  "round-table": (w, d) => {
    const size = Math.min(42, w * 0.3, d * 0.3);
    const half = size / 2;
    const overhang = Math.min(26, w * 0.18, d * 0.18);
    return (
      <>
        <Seat x={0} y={-d / 2 + half} rotation={0} size={size} />
        <Seat x={w / 2 - half} y={0} rotation={90} size={size} />
        <Seat x={0} y={d / 2 - half} rotation={180} size={size} />
        <Seat x={-w / 2 + half} y={0} rotation={270} size={size} />
        <ellipse rx={w / 2 - overhang} ry={d / 2 - overhang} />
      </>
    );
  },

  chair: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={6} />
      <Box
        x={-w / 2}
        y={-d / 2}
        w={w}
        h={clamp(d * 0.16, 4, 8)}
        r={3}
        className="soft"
      />
    </>
  ),

  desk: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} />
      <Box
        x={-w * 0.2}
        y={-d / 2 + 8}
        w={w * 0.4}
        h={3}
        r={1}
        className="solid"
      />
      <Box
        x={-Math.min(20, w * 0.2)}
        y={-d / 2 + 22}
        w={Math.min(40, w * 0.4)}
        h={Math.min(13, d * 0.2)}
        r={2}
        className="detail"
      />
    </>
  ),

  "office-chair": (w, d) => (
    <>
      <Box x={-w / 2 + 3} y={-d / 2 + 7} w={w - 6} h={d - 8} r={12} />
      <Box x={-w / 2 + 7} y={-d / 2} w={w - 14} h={10} r={5} className="soft" />
    </>
  ),

  toilet: (w, d) => {
    const tank = d * 0.26;
    const bowl = (d - tank) / 2;
    return (
      <>
        <ellipse cy={-d / 2 + tank + bowl - 2} rx={w * 0.46} ry={bowl + 2} />
        <ellipse
          cy={-d / 2 + tank + bowl + 1}
          rx={w * 0.28}
          ry={bowl * 0.62}
          className="detail"
        />
        <Box x={-w / 2} y={-d / 2} w={w} h={tank} r={2} />
      </>
    );
  },

  bathtub: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={4} />
      <Box
        x={-w / 2 + 6}
        y={-d / 2 + 6}
        w={w - 12}
        h={d - 12}
        r={Math.min(28, (d - 12) / 2)}
      />
      <circle
        className="detail"
        cx={-w / 2 + Math.min(26, w * 0.2)}
        cy={0}
        r={3}
      />
    </>
  ),

  shower: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={1} />
      <line className="detail" x1={-w / 2} y1={-d / 2} x2={w / 2} y2={d / 2} />
      <line className="detail" x1={w / 2} y1={-d / 2} x2={-w / 2} y2={d / 2} />
      <circle r={4} />
    </>
  ),

  vanity,
  "double-vanity": vanity,

  rug: (w, d) => (
    <>
      <Box x={-w / 2} y={-d / 2} w={w} h={d} r={2} className="rug" />
      <Box
        x={-w / 2 + 8}
        y={-d / 2 + 8}
        w={w - 16}
        h={d - 16}
        r={1}
        className="detail dashed"
      />
    </>
  ),

  plant: (w, d) => {
    const radius = Math.min(w, d) / 2;
    return (
      <>
        <ellipse rx={w / 2} ry={d / 2} />
        {Array.from({ length: 8 }, (_, index) => (
          <line
            key={index}
            className="detail"
            x1={0}
            y1={0}
            x2={0}
            y2={-radius * 0.82}
            transform={`rotate(${index * 45 + 22.5})`}
          />
        ))}
        <circle r={radius * 0.16} className="solid" />
      </>
    );
  },

  "floor-lamp": (w, d) => (
    <>
      <ellipse rx={w / 2} ry={d / 2} />
      <ellipse rx={w * 0.22} ry={d * 0.22} className="detail" />
      <circle r={1.5} className="solid" />
    </>
  ),

  stairs: (w, d) => {
    const treads = Math.max(3, Math.round(d / 26));
    return (
      <>
        <Box x={-w / 2} y={-d / 2} w={w} h={d} />
        {Array.from({ length: treads - 1 }, (_, index) => {
          const y = -d / 2 + (d * (index + 1)) / treads;
          return (
            <line
              key={index}
              className="detail"
              x1={-w / 2}
              y1={y}
              x2={w / 2}
              y2={y}
            />
          );
        })}
        <path
          className="line"
          d={`M 0 ${d / 2 - 10} V ${-d / 2 + 12} M -6 ${-d / 2 + 21} L 0 ${-d / 2 + 12} L 6 ${-d / 2 + 21}`}
        />
      </>
    );
  },
};
