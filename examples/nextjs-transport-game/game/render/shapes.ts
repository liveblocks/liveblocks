import { TILE_H, TILE_W } from "../constants";

// The map is drawn in a classic 2:1 isometric projection. Tile coordinates
// (x, y) grow toward the bottom right and bottom left of the screen, and z is
// a height in pixels.
export const HALF_W = TILE_W / 2;
export const HALF_H = TILE_H / 2;

export type Ctx = CanvasRenderingContext2D;
export type Point3 = readonly [x: number, y: number, z: number];

export function worldX(x: number, y: number) {
  return (x - y) * HALF_W;
}

export function worldY(x: number, y: number) {
  return (x + y) * HALF_H;
}

// Inverse of worldX / worldY: the (fractional) tile under a point
export function tileAt(wx: number, wy: number) {
  return {
    x: (wx / HALF_W + wy / HALF_H) / 2,
    y: (wy / HALF_H - wx / HALF_W) / 2,
  };
}

const shadeCache = new Map<string, string>();

// Darkens (factor < 1) or lightens (factor > 1) a #rrggbb color
export function shade(color: string, factor: number) {
  const key = `${color}${factor.toFixed(2)}`;
  const cached = shadeCache.get(key);
  if (cached) {
    return cached;
  }
  const value = parseInt(color.slice(1), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(
    (channel) =>
      Math.round(
        factor <= 1
          ? channel * factor
          : channel + (255 - channel) * Math.min(1, factor - 1)
      )
  );
  // A #rrggbb color again, so the result can be shaded further
  const result = `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
  shadeCache.set(key, result);
  return result;
}

// Fills a polygon given in tile coordinates. (ox, oy) is where the tile-space
// origin sits on the canvas.
export function quad(
  ctx: Ctx,
  ox: number,
  oy: number,
  points: readonly Point3[],
  fill: string
) {
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    const px = ox + (x - y) * HALF_W;
    const py = oy + (x + y) * HALF_H - z;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// An axis-aligned block, lit from the left
export function box(
  ctx: Ctx,
  ox: number,
  oy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  color: string,
  topColor = color
) {
  quad(
    ctx,
    ox,
    oy,
    [
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
    ],
    shade(color, 0.84)
  );
  quad(
    ctx,
    ox,
    oy,
    [
      [x1, y0, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x1, y0, z0],
    ],
    shade(color, 0.66)
  );
  quad(
    ctx,
    ox,
    oy,
    [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
    ],
    topColor
  );
}

// A pitched roof sitting on top of a block
export function gableRoof(
  ctx: Ctx,
  ox: number,
  oy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  rise: number,
  color: string,
  wallColor: string,
  ridgeAlongX = true
) {
  const top = z + rise;
  if (ridgeAlongX) {
    const ym = (y0 + y1) / 2;
    quad(
      ctx,
      ox,
      oy,
      [
        [x0, y0, z],
        [x1, y0, z],
        [x1, ym, top],
        [x0, ym, top],
      ],
      shade(color, 0.7)
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [x1, y0, z],
        [x1, y1, z],
        [x1, ym, top],
      ],
      shade(wallColor, 0.66)
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [x0, ym, top],
        [x1, ym, top],
        [x1, y1, z],
        [x0, y1, z],
      ],
      color
    );
  } else {
    const xm = (x0 + x1) / 2;
    quad(
      ctx,
      ox,
      oy,
      [
        [x0, y0, z],
        [x0, y1, z],
        [xm, y1, top],
        [xm, y0, top],
      ],
      shade(color, 1.1)
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [x0, y1, z],
        [x1, y1, z],
        [xm, y1, top],
      ],
      shade(wallColor, 0.84)
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [xm, y0, top],
        [xm, y1, top],
        [x1, y1, z],
        [x1, y0, z],
      ],
      shade(color, 0.8)
    );
  }
}

// A roof that slopes up from all four sides of a block to a point
export function hipRoof(
  ctx: Ctx,
  ox: number,
  oy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z: number,
  rise: number,
  color: string
) {
  const top: Point3 = [(x0 + x1) / 2, (y0 + y1) / 2, z + rise];
  const corners: Point3[] = [
    [x0, y0, z],
    [x1, y0, z],
    [x1, y1, z],
    [x0, y1, z],
  ];
  // The two sides at the back first, then the two at the front
  const shades = [0.7, 0.8, 1, 1.1];
  for (const side of [0, 3, 1, 2]) {
    quad(
      ctx,
      ox,
      oy,
      [corners[side], corners[(side + 1) % 4], top],
      shade(color, shades[side])
    );
  }
}

// A band of windows on the left (y-facing) or right (x-facing) side of a block
export function windowBand(
  ctx: Ctx,
  ox: number,
  oy: number,
  side: "left" | "right",
  from: number,
  to: number,
  at: number,
  z0: number,
  z1: number,
  color: string
) {
  quad(
    ctx,
    ox,
    oy,
    side === "left"
      ? [
          [from, at, z1],
          [to, at, z1],
          [to, at, z0],
          [from, at, z0],
        ]
      : [
          [at, from, z1],
          [at, to, z1],
          [at, to, z0],
          [at, from, z0],
        ],
    color
  );
}

export function cylinder(
  ctx: Ctx,
  ox: number,
  oy: number,
  cx: number,
  cy: number,
  radius: number,
  z0: number,
  z1: number,
  color: string,
  topColor = shade(color, 1.25)
) {
  const px = ox + (cx - cy) * HALF_W;
  const bottom = oy + (cx + cy) * HALF_H - z0;
  const top = oy + (cx + cy) * HALF_H - z1;
  // A circle on the ground projects to an ellipse twice as wide as it is tall
  const rx = radius * Math.SQRT2 * HALF_W;
  const ry = radius * Math.SQRT2 * HALF_H;

  const gradient = ctx.createLinearGradient(px - rx, 0, px + rx, 0);
  gradient.addColorStop(0, shade(color, 0.92));
  gradient.addColorStop(1, shade(color, 0.62));

  ctx.beginPath();
  ctx.moveTo(px - rx, top);
  ctx.lineTo(px - rx, bottom);
  ctx.ellipse(px, bottom, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(px + rx, top);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(px, top, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = topColor;
  ctx.fill();
}

// A block rotated to face any direction (dx, dy), used for vehicles. Only
// the sides that face the camera are drawn.
export function orientedBox(
  ctx: Ctx,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  length: number,
  width: number,
  z0: number,
  z1: number,
  color: string,
  topColor = color
) {
  const hx = (dx * length) / 2;
  const hy = (dy * length) / 2;
  const wx = (-dy * width) / 2;
  const wy = (dx * width) / 2;

  const corners = [
    [cx + hx + wx, cy + hy + wy],
    [cx + hx - wx, cy + hy - wy],
    [cx - hx - wx, cy - hy - wy],
    [cx - hx + wx, cy - hy + wy],
  ];
  // Outward normal of the side between corner i and corner i + 1
  const normals = [
    [dx, dy],
    [dy, -dx],
    [-dx, -dy],
    [-dy, dx],
  ];

  if (z1 > z0) {
    for (let i = 0; i < 4; i++) {
      const [nx, ny] = normals[i];
      if (nx + ny <= 0.001) {
        continue;
      }
      const a = corners[i];
      const b = corners[(i + 1) % 4];
      quad(
        ctx,
        0,
        0,
        [
          [a[0], a[1], z1],
          [b[0], b[1], z1],
          [b[0], b[1], z0],
          [a[0], a[1], z0],
        ],
        shade(color, 0.75 + 0.09 * (ny - nx))
      );
    }
  }

  quad(
    ctx,
    0,
    0,
    corners.map(([x, y]) => [x, y, z1] as const),
    topColor
  );
}

export function tileDiamond(ctx: Ctx, x: number, y: number, inset = 0) {
  const px = worldX(x, y);
  const py = worldY(x, y);
  ctx.beginPath();
  ctx.moveTo(px, py + inset);
  ctx.lineTo(px + HALF_W - inset * 2, py + HALF_H);
  ctx.lineTo(px, py + TILE_H - inset);
  ctx.lineTo(px - HALF_W + inset * 2, py + HALF_H);
  ctx.closePath();
}
