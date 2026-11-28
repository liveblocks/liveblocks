import { TILE_H, TILE_W } from "../constants";
import { createRng, type Rng } from "../rng";
import type { IndustryType } from "../world";
import {
  box,
  type Ctx,
  cylinder,
  gableRoof,
  HALF_H,
  HALF_W,
  hipRoof,
  quad,
  shade,
  windowBand,
} from "./shapes";

// Everything that never changes (trees, houses, industries) is drawn once
// into a small off-screen canvas, then stamped onto the map every frame.
export type Sprite = {
  canvas: HTMLCanvasElement;
  // How many canvas pixels the picture has per world pixel
  scale: number;
  // Size in world pixels, and where the tile-space origin is inside of it
  width: number;
  height: number;
  ax: number;
  ay: number;
  draw: (ctx: Ctx, ox: number, oy: number) => void;
};

export type CanvasFactory = (
  width: number,
  height: number
) => HTMLCanvasElement;

export type Sprites = {
  // [tree count - 1][variant]
  trees: Sprite[][];
  // [house variant][look]: every kind of building comes in several shapes
  // and colors
  houses: Sprite[][];
  industries: Record<IndustryType, Sprite>;
};

// A sprite that has fewer pixels than the screen shows looks blurry, so
// sprites are drawn again with more pixels when the map is zoomed in.
const MIN_SPRITE_SCALE = 2;
const MAX_SPRITE_SCALE = 6;
const PADDING = 3;

// How many pixels per world pixel a sprite needs to look sharp, when one
// world pixel covers this many screen pixels
export function spriteScale(screenPixels: number) {
  return Math.max(
    MIN_SPRITE_SCALE,
    Math.min(MAX_SPRITE_SCALE, Math.ceil(screenPixels - 0.01))
  );
}

function paint(sprite: Sprite, scale: number) {
  const { canvas } = sprite;
  // Resizing a canvas also clears it
  canvas.width = Math.ceil(sprite.width * scale);
  canvas.height = Math.ceil(sprite.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  sprite.draw(ctx, sprite.ax, sprite.ay);
  sprite.scale = scale;
}

// The sprite's picture, with this many pixels per world pixel. Each sprite
// only keeps one version, so memory use doesn't grow while zooming.
export function spriteImage(sprite: Sprite, scale: number) {
  if (sprite.scale !== scale) {
    paint(sprite, scale);
  }
  return sprite.canvas;
}

// `draw` runs again every time the sprite changes resolution, so it has to
// draw the exact same picture each time
function makeSprite(
  createCanvas: CanvasFactory,
  tiles: number,
  maxHeight: number,
  draw: (ctx: Ctx, ox: number, oy: number) => void
): Sprite {
  const width = tiles * TILE_W + PADDING * 2;
  const height = maxHeight + tiles * TILE_H + PADDING * 2;
  const sprite: Sprite = {
    canvas: createCanvas(1, 1),
    scale: 0,
    width,
    height,
    ax: tiles * HALF_W + PADDING,
    ay: maxHeight + PADDING,
    draw,
  };
  paint(sprite, MIN_SPRITE_SCALE);
  return sprite;
}

function circle(ctx: Ctx, x: number, y: number, radius: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function groundShadow(ctx: Ctx, x: number, y: number, rx: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fill();
}

function drawTree(
  ctx: Ctx,
  x: number,
  y: number,
  conifer: boolean,
  scale: number,
  color: string
) {
  groundShadow(ctx, x, y, 6 * scale);
  ctx.fillStyle = "#6b4a2b";
  ctx.fillRect(x - 1, y - 5 * scale, 2, 5 * scale);

  if (conifer) {
    for (let tier = 0; tier < 3; tier++) {
      const half = (6.5 - tier * 1.5) * scale;
      const base = y - (3 + tier * 5) * scale;
      ctx.beginPath();
      ctx.moveTo(x - half, base);
      ctx.lineTo(x + half, base);
      ctx.lineTo(x, base - 9 * scale);
      ctx.closePath();
      ctx.fillStyle = shade(color, 0.8 + tier * 0.12);
      ctx.fill();
    }
  } else {
    circle(ctx, x, y - 10 * scale, 6.5 * scale, shade(color, 0.85));
    circle(ctx, x - 1.5 * scale, y - 11.5 * scale, 4.2 * scale, color);
  }
}

// A few trees scattered over an area of `tiles` by `tiles` tiles, drawn back
// to front. `keep` lets callers leave room for something else.
function drawTrees(
  ctx: Ctx,
  ox: number,
  oy: number,
  rng: Rng,
  count: number,
  tiles: number,
  conifers: number,
  keep: (x: number, y: number) => boolean = () => true
) {
  const trees: { x: number; y: number; conifer: boolean; scale: number }[] = [];
  for (
    let attempt = 0;
    attempt < count * 6 && trees.length < count;
    attempt++
  ) {
    const x = 0.16 + rng() * (tiles - 0.32);
    const y = 0.16 + rng() * (tiles - 0.32);
    if (keep(x, y)) {
      trees.push({
        x,
        y,
        conifer: rng() < conifers,
        scale: 0.85 + rng() * 0.35,
      });
    }
  }
  trees.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const tree of trees) {
    drawTree(
      ctx,
      ox + (tree.x - tree.y) * HALF_W,
      oy + (tree.x + tree.y) * HALF_H,
      tree.conifer,
      tree.scale,
      tree.conifer ? "#2f7a4a" : "#4f9a3f"
    );
  }
}

const WALLS = ["#f3ead9", "#e6d3b8", "#f7f2e8", "#dcb99c"];
const ROOFS = ["#b4533c", "#8c5a44", "#5f6b7a", "#a8452f"];
const OFFICES = ["#cfd6de", "#d9cfc3", "#b9c7d6", "#e4dccb"];
const GLASS = "#5d7f9c";

const BRICK = "#9a6b55";
const DOOR = "#7a5236";

// A chimney standing on the front slope of a roof
function chimney(
  ctx: Ctx,
  ox: number,
  oy: number,
  x: number,
  y: number,
  z0: number,
  z1: number
) {
  box(ctx, ox, oy, x, y, x + 0.08, y + 0.08, z0, z1, BRICK, shade(BRICK, 0.7));
}

// Every kind of building comes in a few shapes, each in a few colors, so
// that no two streets look the same. `shape` picks the shape.
function drawCottage(
  ctx: Ctx,
  ox: number,
  oy: number,
  color: number,
  shape: number
) {
  const wall = WALLS[(color + shape) % WALLS.length];
  const roof = ROOFS[color % ROOFS.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 19);

  if (shape === 1) {
    // A long bungalow
    box(ctx, ox, oy, 0.14, 0.3, 0.86, 0.72, 0, 7, wall);
    windowBand(ctx, ox, oy, "left", 0.22, 0.36, 0.72, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "left", 0.45, 0.55, 0.72, 0, 5, DOOR);
    windowBand(ctx, ox, oy, "left", 0.64, 0.78, 0.72, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.42, 0.6, 0.86, 2.5, 5.5, GLASS);
    gableRoof(ctx, ox, oy, 0.1, 0.26, 0.9, 0.76, 7, 7, roof, wall);
    chimney(ctx, ox, oy, 0.24, 0.58, 10.5, 16);
  } else if (shape === 2) {
    // Two wings in an L
    box(ctx, ox, oy, 0.16, 0.18, 0.84, 0.54, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.22, 0.36, 0.54, 3, 6, GLASS);
    gableRoof(ctx, ox, oy, 0.12, 0.14, 0.88, 0.58, 8, 7, roof, wall);
    box(ctx, ox, oy, 0.46, 0.5, 0.82, 0.86, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.56, 0.72, 0.86, 3, 6, GLASS);
    windowBand(ctx, ox, oy, "right", 0.62, 0.72, 0.82, 0, 5, DOOR);
    gableRoof(ctx, ox, oy, 0.42, 0.46, 0.86, 0.9, 8, 7, roof, wall, false);
  } else if (shape === 3) {
    // A square villa of two floors, under a roof that comes to a point
    box(ctx, ox, oy, 0.22, 0.22, 0.78, 0.78, 0, 13, wall);
    windowBand(ctx, ox, oy, "left", 0.45, 0.55, 0.78, 0, 5.5, DOOR);
    windowBand(ctx, ox, oy, "left", 0.62, 0.72, 0.78, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.3, 0.44, 0.78, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.56, 0.7, 0.78, 2.5, 5.5, GLASS);
    for (const side of ["left", "right"] as const) {
      windowBand(ctx, ox, oy, side, 0.3, 0.44, 0.78, 8, 11, GLASS);
      windowBand(ctx, ox, oy, side, 0.56, 0.7, 0.78, 8, 11, GLASS);
    }
    hipRoof(ctx, ox, oy, 0.17, 0.17, 0.83, 0.83, 13, 9, roof);
  } else if (shape === 4) {
    // Two small houses that share a wall
    [0.1, 0.52].forEach((from, index) => {
      const own = WALLS[(color + shape + index) % WALLS.length];
      box(ctx, ox, oy, from, 0.26, from + 0.38, 0.78, 0, 8, own);
      windowBand(
        ctx,
        ox,
        oy,
        "left",
        from + 0.06,
        from + 0.15,
        0.78,
        0,
        5,
        DOOR
      );
      windowBand(
        ctx,
        ox,
        oy,
        "left",
        from + 0.2,
        from + 0.32,
        0.78,
        2.5,
        5.5,
        GLASS
      );
      gableRoof(
        ctx,
        ox,
        oy,
        from - 0.03,
        0.22,
        from + 0.41,
        0.82,
        8,
        7,
        ROOFS[(color + index) % ROOFS.length],
        own,
        false
      );
    });
    windowBand(ctx, ox, oy, "right", 0.4, 0.6, 0.9, 2.5, 5.5, GLASS);
  } else if (shape === 5) {
    // A small house at the back of a garden
    box(ctx, ox, oy, 0.12, 0.12, 0.62, 0.62, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.3, 0.4, 0.62, 0, 5, DOOR);
    windowBand(ctx, ox, oy, "right", 0.26, 0.46, 0.62, 2.5, 5.5, GLASS);
    gableRoof(
      ctx,
      ox,
      oy,
      0.08,
      0.08,
      0.66,
      0.66,
      8,
      7,
      roof,
      wall,
      color % 2 === 0
    );
    drawTree(
      ctx,
      ox + (0.8 - 0.42) * HALF_W,
      oy + (0.8 + 0.42) * HALF_H,
      false,
      0.75,
      "#4f9a3f"
    );
    drawTree(
      ctx,
      ox + (0.36 - 0.82) * HALF_W,
      oy + (0.36 + 0.82) * HALF_H,
      color % 2 === 1,
      0.7,
      color % 2 === 1 ? "#2f7a4a" : "#4f9a3f"
    );
    box(ctx, ox, oy, 0.08, 0.9, 0.94, 0.94, 0, 2.5, "#3f8a3a");
    box(ctx, ox, oy, 0.9, 0.08, 0.94, 0.9, 0, 2.5, "#3f8a3a");
  } else {
    box(ctx, ox, oy, 0.24, 0.24, 0.76, 0.76, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.44, 0.56, 0.76, 0, 5, DOOR);
    windowBand(ctx, ox, oy, "right", 0.36, 0.5, 0.76, 3, 6, GLASS);
    gableRoof(
      ctx,
      ox,
      oy,
      0.2,
      0.2,
      0.8,
      0.8,
      8,
      8,
      roof,
      wall,
      color % 2 === 0
    );
  }
}

// Townhouses and small blocks of flats
function drawTownhouse(
  ctx: Ctx,
  ox: number,
  oy: number,
  color: number,
  shape: number
) {
  const wall = WALLS[(color + 1 + shape) % WALLS.length];
  const roof = ROOFS[(color + 2) % ROOFS.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 22);

  if (shape === 1) {
    // A terrace of three floors under a pitched roof, with chimneys
    box(ctx, ox, oy, 0.14, 0.2, 0.86, 0.8, 0, 15, wall);
    for (const z of [3, 9.5]) {
      for (const from of [0.2, 0.43, 0.66]) {
        const isDoor = z === 3 && from === 0.43;
        windowBand(
          ctx,
          ox,
          oy,
          "left",
          from,
          from + (isDoor ? 0.1 : 0.14),
          0.8,
          isDoor ? 0 : z,
          z + 3.5,
          isDoor ? DOOR : GLASS
        );
      }
      windowBand(ctx, ox, oy, "right", 0.28, 0.44, 0.86, z, z + 3.5, GLASS);
      windowBand(ctx, ox, oy, "right", 0.56, 0.72, 0.86, z, z + 3.5, GLASS);
    }
    gableRoof(ctx, ox, oy, 0.1, 0.16, 0.9, 0.84, 15, 8, roof, wall);
    chimney(ctx, ox, oy, 0.26, 0.6, 19, 26);
    chimney(ctx, ox, oy, 0.66, 0.6, 19, 26);
  } else if (shape === 2) {
    // A block of flats with balconies
    box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, 24, wall);
    for (const z of [3, 10, 17]) {
      windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.86, z, z + 4, GLASS);
      windowBand(ctx, ox, oy, "right", 0.22, 0.46, 0.86, z, z + 4, GLASS);
      windowBand(ctx, ox, oy, "right", 0.54, 0.78, 0.86, z, z + 4, GLASS);
      if (z > 3) {
        box(ctx, ox, oy, 0.2, 0.86, 0.8, 0.93, z - 1.5, z + 0.5, "#ece7dc");
      }
    }
    box(
      ctx,
      ox,
      oy,
      0.12,
      0.12,
      0.88,
      0.88,
      24,
      25.5,
      shade(wall, 0.92),
      shade(roof, 0.9)
    );
    box(ctx, ox, oy, 0.3, 0.3, 0.5, 0.5, 25.5, 29, "#9aa3ad");
  } else if (shape === 3) {
    // Two floors at the front, with more flats set back above them
    box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, 11, wall, "#b8b2a4");
    for (const side of ["left", "right"] as const) {
      windowBand(ctx, ox, oy, side, 0.2, 0.42, 0.86, 3, 7.5, GLASS);
      windowBand(ctx, ox, oy, side, 0.56, 0.8, 0.86, 3, 7.5, GLASS);
    }
    windowBand(ctx, ox, oy, "left", 0.45, 0.53, 0.86, 0, 6, DOOR);
    const upper = WALLS[(color + shape + 2) % WALLS.length];
    box(ctx, ox, oy, 0.14, 0.14, 0.64, 0.64, 11, 23, upper, shade(roof, 0.9));
    for (const z of [13.5, 18.5]) {
      windowBand(ctx, ox, oy, "left", 0.2, 0.58, 0.64, z, z + 3, GLASS);
      windowBand(ctx, ox, oy, "right", 0.2, 0.58, 0.64, z, z + 3, GLASS);
    }
    cylinder(ctx, ox, oy, 0.76, 0.76, 0.045, 11, 14.5, "#4f9a3f");
  } else if (shape === 4) {
    // An older block, with rooms under a steep roof
    box(ctx, ox, oy, 0.16, 0.16, 0.84, 0.84, 0, 14, wall);
    for (const z of [2.5, 8.5]) {
      for (const from of [0.22, 0.44, 0.66]) {
        windowBand(
          ctx,
          ox,
          oy,
          "left",
          from,
          from + 0.12,
          0.84,
          z,
          z + 3.5,
          GLASS
        );
        windowBand(
          ctx,
          ox,
          oy,
          "right",
          from,
          from + 0.12,
          0.84,
          z,
          z + 3.5,
          GLASS
        );
      }
    }
    quad(
      ctx,
      ox,
      oy,
      [
        [0.14, 0.86, 14],
        [0.86, 0.86, 14],
        [0.74, 0.74, 21],
        [0.26, 0.74, 21],
      ],
      roof
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [0.86, 0.14, 14],
        [0.86, 0.86, 14],
        [0.74, 0.74, 21],
        [0.74, 0.26, 21],
      ],
      shade(roof, 0.75)
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [0.26, 0.26, 21],
        [0.74, 0.26, 21],
        [0.74, 0.74, 21],
        [0.26, 0.74, 21],
      ],
      shade(roof, 1.12)
    );
    for (const from of [0.3, 0.6]) {
      windowBand(
        ctx,
        ox,
        oy,
        "left",
        from,
        from + 0.1,
        0.81,
        15.5,
        18.5,
        "#f3ead9"
      );
      windowBand(
        ctx,
        ox,
        oy,
        "right",
        from,
        from + 0.1,
        0.81,
        15.5,
        18.5,
        "#d9cfbd"
      );
    }
  } else {
    box(ctx, ox, oy, 0.16, 0.16, 0.84, 0.84, 0, 18, wall, shade(roof, 0.9));
    for (const z of [4, 11]) {
      for (const side of ["left", "right"] as const) {
        windowBand(ctx, ox, oy, side, 0.24, 0.42, 0.84, z, z + 4, GLASS);
        windowBand(ctx, ox, oy, side, 0.56, 0.74, 0.84, z, z + 4, GLASS);
      }
    }
    box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 18, 19.5, shade(roof, 1.05));
  }
}

function drawOffice(
  ctx: Ctx,
  ox: number,
  oy: number,
  color: number,
  shape: number
) {
  const wall = OFFICES[(color + shape) % OFFICES.length];
  const height = 30 + (color % 3) * 5;
  groundShadow(ctx, ox, oy + HALF_H + 3, 23);

  if (shape === 1) {
    // Tall windows between piers, under a heavy cornice
    const stone = WALLS[(color + 3) % WALLS.length];
    box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, height, stone);
    for (const from of [0.2, 0.37, 0.54, 0.71]) {
      for (const side of ["left", "right"] as const) {
        windowBand(
          ctx,
          ox,
          oy,
          side,
          from,
          from + 0.09,
          0.86,
          8,
          height - 3,
          GLASS
        );
      }
    }
    windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.86, 1.5, 6, shade(GLASS, 0.8));
    windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.86, 1.5, 6, shade(GLASS, 0.8));
    box(
      ctx,
      ox,
      oy,
      0.11,
      0.11,
      0.89,
      0.89,
      height,
      height + 2.5,
      shade(stone, 0.9),
      shade(stone, 0.8)
    );
  } else if (shape === 2) {
    // A slab at the back, behind a low glass hall
    box(
      ctx,
      ox,
      oy,
      0.14,
      0.14,
      0.86,
      0.56,
      0,
      height + 6,
      wall,
      shade(wall, 1.2)
    );
    for (let z = 15; z + 4 < height + 6; z += 6.5) {
      windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.56, z, z + 3.5, GLASS);
    }
    for (let z = 4; z + 4 < height + 6; z += 6.5) {
      windowBand(ctx, ox, oy, "right", 0.19, 0.51, 0.86, z, z + 3.5, GLASS);
    }
    box(
      ctx,
      ox,
      oy,
      0.2,
      0.56,
      0.86,
      0.86,
      0,
      11,
      shade(wall, 0.92),
      "#aab3bd"
    );
    windowBand(ctx, ox, oy, "left", 0.25, 0.81, 0.86, 2, 9, GLASS);
    windowBand(ctx, ox, oy, "right", 0.6, 0.82, 0.86, 2, 9, GLASS);
    box(ctx, ox, oy, 0.3, 0.24, 0.5, 0.44, height + 6, height + 9, "#9aa3ad");
  } else {
    box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, height, wall, shade(wall, 1.2));
    for (let z = 4; z + 4 < height; z += 6.5) {
      windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.86, z, z + 3.5, GLASS);
      windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.86, z, z + 3.5, GLASS);
    }
    box(ctx, ox, oy, 0.4, 0.4, 0.62, 0.62, height, height + 4, "#9aa3ad");
  }
}

// Rows of windows all the way up both visible sides of a block
function floors(
  ctx: Ctx,
  ox: number,
  oy: number,
  from: number,
  to: number,
  z0: number,
  z1: number,
  color: string
) {
  for (let z = z0 + 3; z + 3 <= z1; z += 5.5) {
    windowBand(
      ctx,
      ox,
      oy,
      "left",
      from + 0.05,
      to - 0.05,
      to,
      z,
      z + 3,
      color
    );
    windowBand(
      ctx,
      ox,
      oy,
      "right",
      from + 0.05,
      to - 0.05,
      to,
      z,
      z + 3,
      color
    );
  }
}

// A round tower: floors of wall and glass, one on top of the other
function roundFloors(
  ctx: Ctx,
  ox: number,
  oy: number,
  radius: number,
  z0: number,
  z1: number,
  wall: string,
  glass: string,
  every = 5.5
) {
  for (let z = z0; z < z1; z += every) {
    const glassFrom = Math.min(z1, z + every - 3);
    const glassTo = Math.min(z1, z + every);
    cylinder(ctx, ox, oy, 0.5, 0.5, radius, z, glassFrom, wall, wall);
    if (glassTo > glassFrom) {
      cylinder(ctx, ox, oy, 0.5, 0.5, radius, glassFrom, glassTo, glass, glass);
    }
  }
}

const TOWERS = ["#d3d9df", "#e2d6c2", "#bccbd9", "#d9d2c6"];

function drawTower(
  ctx: Ctx,
  ox: number,
  oy: number,
  color: number,
  shape: number
) {
  const wall = TOWERS[(color + shape) % TOWERS.length];
  const height = 56 + (color % 3) * 7;
  groundShadow(ctx, ox, oy + HALF_H + 3, 24);

  if (shape === 1) {
    // A round tower on a square base
    box(ctx, ox, oy, 0.12, 0.12, 0.88, 0.88, 0, 7, shade(wall, 0.8));
    windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
    roundFloors(ctx, ox, oy, 0.33, 7, height, wall, GLASS);
    cylinder(ctx, ox, oy, 0.5, 0.5, 0.33, height, height + 2, wall);
    cylinder(ctx, ox, oy, 0.5, 0.5, 0.12, height + 2, height + 6, "#8f98a3");
  } else if (shape === 2) {
    // Two slim towers, the one at the back taller than the other
    box(ctx, ox, oy, 0.1, 0.1, 0.9, 0.9, 0, 6, shade(wall, 0.8));
    box(
      ctx,
      ox,
      oy,
      0.14,
      0.14,
      0.54,
      0.54,
      6,
      height + 8,
      wall,
      shade(wall, 1.15)
    );
    floors(ctx, ox, oy, 0.14, 0.54, 6, height + 8, GLASS);
    box(
      ctx,
      ox,
      oy,
      0.26,
      0.26,
      0.42,
      0.42,
      height + 8,
      height + 12,
      "#8f98a3"
    );
    const other = TOWERS[(color + shape + 1) % TOWERS.length];
    box(
      ctx,
      ox,
      oy,
      0.48,
      0.48,
      0.86,
      0.86,
      6,
      height - 12,
      other,
      shade(other, 1.15)
    );
    floors(ctx, ox, oy, 0.48, 0.86, 6, height - 12, GLASS);
    box(ctx, ox, oy, 0.6, 0.6, 0.74, 0.74, height - 12, height - 9, "#a9b1ba");
  } else {
    box(ctx, ox, oy, 0.12, 0.12, 0.88, 0.88, 0, 7, shade(wall, 0.8));
    windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
    box(
      ctx,
      ox,
      oy,
      0.18,
      0.18,
      0.82,
      0.82,
      7,
      height,
      wall,
      shade(wall, 1.15)
    );
    floors(ctx, ox, oy, 0.18, 0.82, 7, height, GLASS);
    box(ctx, ox, oy, 0.34, 0.34, 0.6, 0.6, height, height + 5, "#8f98a3");
    box(ctx, ox, oy, 0.62, 0.4, 0.72, 0.5, height, height + 3, "#a9b1ba");
  }
}

// [glass, frame] of each skyscraper
const SKYSCRAPERS = [
  ["#6f9cc4", "#dfe6ec"],
  ["#5fa6a2", "#e4e2d8"],
  ["#55647a", "#c6ccd4"],
  ["#8fb4d6", "#f0ead9"],
];

// A mast with a red light on top, for the tallest buildings
function mast(ctx: Ctx, ox: number, oy: number, z0: number, z1: number) {
  box(ctx, ox, oy, 0.485, 0.485, 0.515, 0.515, z0, z1, "#c8ced6");
  ctx.fillStyle = "#e5484d";
  ctx.fillRect(ox - 1, oy + HALF_H - z1 - 2, 2, 2);
}

function drawSkyscraper(
  ctx: Ctx,
  ox: number,
  oy: number,
  color: number,
  shape: number
) {
  const [glass, frame] = SKYSCRAPERS[(color + shape) % SKYSCRAPERS.length];
  const shaft = 84 + (color % 2) * 10;
  const crown = shaft + 20 + (color % 3) * 4;
  groundShadow(ctx, ox, oy + HALF_H + 3, 25);

  // A wide base that every skyscraper stands on
  box(ctx, ox, oy, 0.1, 0.1, 0.9, 0.9, 0, 10, frame);
  windowBand(ctx, ox, oy, "left", 0.18, 0.82, 0.9, 2, 8, shade(glass, 0.8));
  windowBand(ctx, ox, oy, "right", 0.18, 0.82, 0.9, 2, 8, shade(glass, 0.8));

  if (shape === 1) {
    // Stone steps that get narrower toward the top
    const steps = [
      [0.16, 10, 52],
      [0.24, 52, 84],
      [0.32, 84, 106],
      [0.4, 106, 118],
    ];
    for (const [inset, from, to] of steps) {
      box(ctx, ox, oy, inset, inset, 1 - inset, 1 - inset, from, to, frame);
      floors(ctx, ox, oy, inset, 1 - inset, from, to, shade(glass, 0.9));
    }
    mast(ctx, ox, oy, 118, 134);
  } else if (shape === 2) {
    // A round tower of glass
    roundFloors(
      ctx,
      ox,
      oy,
      0.36,
      10,
      crown - 8,
      glass,
      shade(glass, 1.45),
      11
    );
    cylinder(ctx, ox, oy, 0.5, 0.5, 0.36, crown - 8, crown - 6, frame);
    cylinder(ctx, ox, oy, 0.5, 0.5, 0.2, crown - 6, crown, glass, frame);
    mast(ctx, ox, oy, crown, crown + 14);
  } else {
    // A glass shaft, and a narrower crown with a mast on top
    box(ctx, ox, oy, 0.18, 0.18, 0.82, 0.82, 10, shaft, glass, frame);
    floors(ctx, ox, oy, 0.18, 0.82, 10, shaft, shade(glass, 1.45));
    for (const edge of [0.18, 0.5, 0.78]) {
      windowBand(
        ctx,
        ox,
        oy,
        "left",
        edge,
        edge + 0.04,
        0.82,
        10,
        shaft,
        frame
      );
      windowBand(
        ctx,
        ox,
        oy,
        "right",
        edge,
        edge + 0.04,
        0.82,
        10,
        shaft,
        frame
      );
    }
    box(ctx, ox, oy, 0.3, 0.3, 0.7, 0.7, shaft, crown, glass, frame);
    floors(ctx, ox, oy, 0.3, 0.7, shaft, crown, shade(glass, 1.45));
    box(ctx, ox, oy, 0.42, 0.42, 0.58, 0.58, crown, crown + 4, "#8f98a3");
    mast(ctx, ox, oy, crown + 4, crown + 18);
  }
}

const AWNINGS = ["#d9534f", "#3f8fbf", "#4a9d5b", "#e0a030"];

// A row of shops, with striped awnings over their windows
function drawShops(ctx: Ctx, ox: number, oy: number, color: number) {
  const wall = WALLS[(color + 2) % WALLS.length];
  const awning = AWNINGS[color % AWNINGS.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 22);
  box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, 14, wall, "#a9a498");
  box(
    ctx,
    ox,
    oy,
    0.14,
    0.14,
    0.86,
    0.86,
    14,
    15.5,
    shade(wall, 0.9),
    "#b9b4a8"
  );
  windowBand(ctx, ox, oy, "left", 0.2, 0.42, 0.86, 1.5, 7.5, GLASS);
  windowBand(ctx, ox, oy, "left", 0.46, 0.56, 0.86, 0, 7.5, "#6b4a2b");
  windowBand(ctx, ox, oy, "left", 0.6, 0.8, 0.86, 1.5, 7.5, GLASS);
  windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.86, 1.5, 7.5, GLASS);
  for (let stripe = 0; stripe < 8; stripe++) {
    const from = 0.14 + stripe * 0.09;
    const fill = stripe % 2 === 0 ? awning : "#f4f1ea";
    quad(
      ctx,
      ox,
      oy,
      [
        [from, 0.86, 11],
        [from + 0.09, 0.86, 11],
        [from + 0.09, 1, 8],
        [from, 1, 8],
      ],
      fill
    );
    quad(
      ctx,
      ox,
      oy,
      [
        [0.86, from, 11],
        [0.86, from + 0.09, 11],
        [1, from + 0.09, 8],
        [1, from, 8],
      ],
      shade(fill, 0.84)
    );
  }
  box(ctx, ox, oy, 0.5, 0.3, 0.74, 0.54, 15.5, 18.5, "#8f98a3");
}

function drawChurch(ctx: Ctx, ox: number, oy: number) {
  const stone = "#ddd5c2";
  const slate = "#5f6b7a";
  groundShadow(ctx, ox, oy + HALF_H + 3, 22);

  // The tower stands at the far end, with the nave in front of it
  box(ctx, ox, oy, 0.12, 0.34, 0.4, 0.66, 0, 32, stone);
  windowBand(ctx, ox, oy, "left", 0.22, 0.3, 0.66, 22, 28, "#4a4f57");
  quad(
    ctx,
    ox,
    oy,
    [
      [0.1, 0.68, 32],
      [0.42, 0.68, 32],
      [0.26, 0.5, 50],
    ],
    shade(slate, 0.9)
  );
  quad(
    ctx,
    ox,
    oy,
    [
      [0.42, 0.32, 32],
      [0.42, 0.68, 32],
      [0.26, 0.5, 50],
    ],
    shade(slate, 0.66)
  );

  box(ctx, ox, oy, 0.38, 0.28, 0.9, 0.72, 0, 13, stone);
  for (const from of [0.46, 0.6, 0.74]) {
    windowBand(
      ctx,
      ox,
      oy,
      "left",
      from,
      from + 0.07,
      0.72,
      3.5,
      10.5,
      "#4f74b3"
    );
  }
  windowBand(ctx, ox, oy, "right", 0.43, 0.57, 0.9, 0, 8, "#6b4a2b");
  gableRoof(ctx, ox, oy, 0.36, 0.25, 0.92, 0.75, 13, 11, slate, stone);
}

// A lawn with paths to a fountain, and trees around it
function drawPark(ctx: Ctx, ox: number, oy: number, variant: number) {
  flat(ctx, ox, oy, 0.05, 0.05, 0.95, 0.95, "#93cf6b");
  flat(ctx, ox, oy, 0.45, 0.05, 0.55, 0.95, "#e3d6ad");
  flat(ctx, ox, oy, 0.05, 0.45, 0.95, 0.55, "#e3d6ad");
  cylinder(ctx, ox, oy, 0.5, 0.5, 0.15, 0, 2.5, "#cfc9bb", "#74b6e6");
  cylinder(ctx, ox, oy, 0.5, 0.5, 0.03, 2.5, 6, "#cfc9bb", "#e9f4fb");
  drawTrees(
    ctx,
    ox,
    oy,
    createRng(31 + variant),
    5,
    1,
    0.15,
    (x, y) => Math.abs(x - 0.5) > 0.2 && Math.abs(y - 0.5) > 0.2
  );
}

function floodlight(ctx: Ctx, ox: number, oy: number, x: number, y: number) {
  const px = ox + (x - y) * HALF_W;
  const py = oy + (x + y) * HALF_H;
  ctx.fillStyle = "#6f757d";
  ctx.fillRect(px - 0.7, py - 36, 1.4, 36);
  ctx.fillStyle = "#f4f1dc";
  ctx.fillRect(px - 3.5, py - 40, 7, 4.5);
}

// Stands on all four sides of a pitch. The ones at the back are taller, so
// the pitch shows from where the map is looked at.
function drawStadium(ctx: Ctx, ox: number, oy: number) {
  const concrete = "#d5d1c7";
  const seats = ["#c8504b", "#e4e0d6", "#c8504b"];
  ground(ctx, ox, oy, "#b9b5aa");
  floodlight(ctx, ox, oy, 0.1, 0.1);

  // Three rows of seats per stand, stepping down toward the pitch
  for (let row = 0; row < 3; row++) {
    const from = 0.12 + row * 0.11;
    const height = 20 - row * 6;
    box(
      ctx,
      ox,
      oy,
      0.12,
      from,
      1.88,
      from + 0.11,
      0,
      height,
      concrete,
      seats[row]
    );
  }
  for (let row = 0; row < 3; row++) {
    const from = 0.12 + row * 0.11;
    const height = 20 - row * 6;
    box(
      ctx,
      ox,
      oy,
      from,
      0.45,
      from + 0.11,
      1.88,
      0,
      height,
      concrete,
      seats[row]
    );
  }
  floodlight(ctx, ox, oy, 1.9, 0.1);
  floodlight(ctx, ox, oy, 0.1, 1.9);

  flat(ctx, ox, oy, 0.5, 0.5, 1.5, 1.5, "#58a84a");
  for (let stripe = 0; stripe < 5; stripe += 2) {
    flat(
      ctx,
      ox,
      oy,
      0.5 + stripe * 0.2,
      0.5,
      0.7 + stripe * 0.2,
      1.5,
      "#62b453"
    );
  }
  const chalk = "#eef5ea";
  flat(ctx, ox, oy, 0.54, 0.54, 1.46, 0.56, chalk);
  flat(ctx, ox, oy, 0.54, 1.44, 1.46, 1.46, chalk);
  flat(ctx, ox, oy, 0.54, 0.54, 0.56, 1.46, chalk);
  flat(ctx, ox, oy, 1.44, 0.54, 1.46, 1.46, chalk);
  flat(ctx, ox, oy, 0.99, 0.54, 1.01, 1.46, chalk);

  for (let row = 2; row >= 0; row--) {
    const from = 1.55 + (2 - row) * 0.11;
    const height = 10 - row * 3;
    box(
      ctx,
      ox,
      oy,
      from,
      0.45,
      from + 0.11,
      1.55,
      0,
      height,
      concrete,
      seats[row]
    );
  }
  for (let row = 2; row >= 0; row--) {
    const from = 1.55 + (2 - row) * 0.11;
    const height = 10 - row * 3;
    box(
      ctx,
      ox,
      oy,
      0.45,
      from,
      1.88,
      from + 0.11,
      0,
      height,
      concrete,
      seats[row]
    );
  }
  floodlight(ctx, ox, oy, 1.9, 1.9);
}

function ground(ctx: Ctx, ox: number, oy: number, color: string) {
  quad(
    ctx,
    ox,
    oy,
    [
      [0.04, 0.04, 0],
      [1.96, 0.04, 0],
      [1.96, 1.96, 0],
      [0.04, 1.96, 0],
    ],
    color
  );
}

function flat(
  ctx: Ctx,
  ox: number,
  oy: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string
) {
  quad(
    ctx,
    ox,
    oy,
    [
      [x0, y0, 0],
      [x1, y0, 0],
      [x1, y1, 0],
      [x0, y1, 0],
    ],
    color
  );
}

function mound(
  ctx: Ctx,
  ox: number,
  oy: number,
  cx: number,
  cy: number,
  radius: number,
  height: number,
  color: string
) {
  const px = ox + (cx - cy) * HALF_W;
  const py = oy + (cx + cy) * HALF_H;
  const rx = radius * Math.SQRT2 * HALF_W;
  const ry = radius * Math.SQRT2 * HALF_H;
  ctx.beginPath();
  ctx.moveTo(px - rx, py);
  ctx.quadraticCurveTo(
    px - rx * 0.3,
    py - height * 1.6,
    px + rx * 0.1,
    py - height
  );
  ctx.quadraticCurveTo(px + rx * 0.6, py - height * 0.7, px + rx, py);
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function derrick(ctx: Ctx, x: number, y: number, height: number) {
  groundShadow(ctx, x, y, 9);
  ctx.strokeStyle = "#3a3d42";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 7, y);
  ctx.lineTo(x, y - height);
  ctx.lineTo(x + 7, y);
  for (const t of [0.3, 0.55, 0.78]) {
    const half = 7 * (1 - t);
    ctx.moveTo(x - half, y - height * t);
    ctx.lineTo(x + half, y - height * t);
  }
  ctx.stroke();
  ctx.fillStyle = "#3a3d42";
  ctx.fillRect(x - 2, y - height - 2, 4, 3);
}

const INDUSTRY_ARTISTS: Record<
  IndustryType,
  (ctx: Ctx, ox: number, oy: number, rng: Rng) => void
> = {
  coal_mine(ctx, ox, oy) {
    ground(ctx, ox, oy, "#7a7163");
    box(ctx, ox, oy, 0.3, 0.3, 0.8, 0.8, 0, 12, "#9a9a9f");
    box(ctx, ox, oy, 0.44, 0.44, 0.66, 0.66, 12, 38, "#5a5e66");
    box(ctx, ox, oy, 0.36, 0.47, 0.74, 0.63, 38, 41, "#33363b");
    mound(ctx, ox, oy, 1.4, 0.6, 0.36, 15, "#2b2b2e");
    box(ctx, ox, oy, 0.3, 1.15, 1, 1.7, 0, 9, "#a8744c");
    gableRoof(ctx, ox, oy, 0.26, 1.11, 1.04, 1.74, 9, 6, "#5c5f66", "#a8744c");
    mound(ctx, ox, oy, 1.45, 1.45, 0.3, 11, "#39393d");
  },

  power_station(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a3a39e");
    for (const x of [0.45, 0.95]) {
      cylinder(ctx, ox, oy, x, 0.42, 0.12, 0, 40, "#c2b9ae");
      cylinder(ctx, ox, oy, x, 0.42, 0.12, 40, 44, "#c8553d");
      cylinder(ctx, ox, oy, x, 0.42, 0.12, 44, 48, "#c2b9ae", "#4a4a4a");
    }
    cylinder(ctx, ox, oy, 1.52, 0.52, 0.3, 0, 26, "#dcd8cf", "#8f8b84");
    box(ctx, ox, oy, 0.2, 0.9, 1.2, 1.8, 0, 22, "#cdc8be", "#aeb3b8");
    windowBand(ctx, ox, oy, "left", 0.3, 1.1, 1.8, 12, 17, GLASS);
    windowBand(ctx, ox, oy, "right", 1, 1.7, 1.2, 12, 17, GLASS);
    box(ctx, ox, oy, 1.2, 1.1, 1.8, 1.8, 0, 13, "#b8b2a8", "#9da2a7");
  },

  forest(ctx, ox, oy, rng) {
    ground(ctx, ox, oy, "#5f9c48");
    drawTrees(ctx, ox, oy, rng, 16, 2, 0.9, (x, y) => x < 1.1 || y < 1.1);
    box(ctx, ox, oy, 1.3, 1.35, 1.78, 1.75, 0, 7, "#9a6a3e");
    gableRoof(ctx, ox, oy, 1.26, 1.31, 1.82, 1.79, 7, 6, "#5b3d24", "#9a6a3e");
  },

  sawmill(ctx, ox, oy) {
    ground(ctx, ox, oy, "#b9a27c");
    box(ctx, ox, oy, 0.25, 0.3, 1.75, 1, 0, 12, "#bb8754");
    windowBand(ctx, ox, oy, "left", 0.5, 1.5, 1, 0, 8, "#6b4a2b");
    gableRoof(ctx, ox, oy, 0.2, 0.25, 1.8, 1.05, 12, 9, "#7a4b2a", "#bb8754");
    box(ctx, ox, oy, 0.25, 1.3, 1.05, 1.48, 0, 4, "#8a5a33", "#a87446");
    box(ctx, ox, oy, 0.25, 1.56, 1.05, 1.74, 0, 4, "#7a4f2c", "#9b693e");
    cylinder(ctx, ox, oy, 1.28, 1.3, 0.07, 0, 24, "#6f6f73", "#3c3c3f");
    box(ctx, ox, oy, 1.36, 1.3, 1.82, 1.76, 0, 9, "#dccdaa", "#8a6a4c");
  },

  farm(ctx, ox, oy) {
    ground(ctx, ox, oy, "#9cc25c");
    flat(ctx, ox, oy, 1.1, 0.12, 1.88, 0.9, "#d8bf58");
    flat(ctx, ox, oy, 0.12, 1.1, 0.9, 1.88, "#c7a546");
    for (let row = 0; row < 5; row++) {
      const offset = 0.2 + row * 0.15;
      flat(
        ctx,
        ox,
        oy,
        1.1 + offset - 0.1,
        0.14,
        1.1 + offset - 0.06,
        0.88,
        "#bfa443"
      );
      flat(
        ctx,
        ox,
        oy,
        0.14,
        1.1 + offset - 0.1,
        0.88,
        1.1 + offset - 0.06,
        "#ad8d38"
      );
    }
    box(ctx, ox, oy, 0.25, 0.25, 0.95, 0.8, 0, 11, "#b5412f");
    windowBand(ctx, ox, oy, "left", 0.5, 0.7, 0.8, 0, 7, "#f1e7d6");
    gableRoof(ctx, ox, oy, 0.2, 0.2, 1, 0.85, 11, 8, "#544c49", "#b5412f");
    cylinder(ctx, ox, oy, 1.4, 1.42, 0.19, 0, 24, "#dcdcd6", "#b9bcc0");
  },

  factory(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a8a49c");
    cylinder(ctx, ox, oy, 0.45, 0.35, 0.1, 0, 44, "#a4614a", "#4a3a35");
    cylinder(ctx, ox, oy, 1.5, 0.45, 0.22, 0, 14, "#d2d6d9");
    box(ctx, ox, oy, 0.2, 0.6, 1.3, 1.8, 0, 18, "#b56b4d", "#8e9296");
    for (const z of [4, 11]) {
      windowBand(ctx, ox, oy, "left", 0.3, 1.2, 1.8, z, z + 4, GLASS);
      windowBand(ctx, ox, oy, "right", 0.7, 1.7, 1.3, z, z + 4, GLASS);
    }
    box(ctx, ox, oy, 1.3, 0.95, 1.82, 1.8, 0, 11, "#c79274", "#9a9ea2");
  },

  oil_wells(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a0957a");
    const spots: [number, number][] = [
      [0.5, 0.5],
      [1.45, 0.7],
      [0.8, 1.45],
    ];
    for (const [x, y] of spots) {
      const px = ox + (x - y) * HALF_W;
      const py = oy + (x + y) * HALF_H;
      ctx.beginPath();
      ctx.ellipse(px + 6, py + 3, 9, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(20, 20, 24, 0.55)";
      ctx.fill();
      derrick(ctx, px, py, 30);
    }
    box(ctx, ox, oy, 1.35, 1.35, 1.75, 1.7, 0, 7, "#c9c2b2", "#7d8187");
  },

  refinery(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a2a29d");
    cylinder(ctx, ox, oy, 0.5, 0.5, 0.32, 0, 16, "#e6e6e1");
    cylinder(ctx, ox, oy, 1.38, 0.45, 0.27, 0, 20, "#d2d6d9");
    cylinder(ctx, ox, oy, 0.5, 1.4, 0.3, 0, 14, "#ebe6d8");
    box(ctx, ox, oy, 0.86, 0.9, 1.2, 1.08, 0, 5, "#7d8187");
    cylinder(ctx, ox, oy, 1.36, 1.3, 0.11, 0, 44, "#b9bec4");
    cylinder(ctx, ox, oy, 1.36, 1.3, 0.11, 30, 33, "#c8553d");
    cylinder(ctx, ox, oy, 1.68, 1.52, 0.08, 0, 34, "#a7adb4");
    const flameX = ox + (1.68 - 1.52) * HALF_W;
    const flameY = oy + (1.68 + 1.52) * HALF_H - 34;
    ctx.beginPath();
    ctx.moveTo(flameX - 3, flameY);
    ctx.quadraticCurveTo(flameX - 1, flameY - 5, flameX, flameY - 9);
    ctx.quadraticCurveTo(flameX + 2, flameY - 4, flameX + 3, flameY);
    ctx.closePath();
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
  },
};

export function createSprites(createCanvas: CanvasFactory): Sprites {
  // Randomly placed details start from a fixed seed per sprite, so that a
  // sprite looks the same every time it's drawn
  const trees: Sprite[][] = [];
  for (let count = 1; count <= 3; count++) {
    const variants: Sprite[] = [];
    for (let variant = 0; variant < 4; variant++) {
      const seed = 7 + count * 4 + variant;
      const conifers = variant % 2 === 0 ? 0.75 : 0.25;
      variants.push(
        makeSprite(createCanvas, 1, 30, (ctx, ox, oy) =>
          drawTrees(ctx, ox, oy, createRng(seed), count, 1, conifers)
        )
      );
    }
    trees.push(variants);
  }

  // In the same order as `BUILDINGS`, with how tall each one can get and how
  // many shapes it comes in. Each shape comes in four colors.
  const houseArtists = [
    { draw: drawCottage, height: 30, shapes: 6 },
    { draw: drawTownhouse, height: 34, shapes: 5 },
    { draw: drawOffice, height: 52, shapes: 3 },
    { draw: drawTower, height: 88, shapes: 3 },
    { draw: drawSkyscraper, height: 150, shapes: 3 },
  ];
  const houses = houseArtists.map(({ draw, height, shapes }) =>
    Array.from({ length: shapes * 4 }, (_, index) =>
      makeSprite(createCanvas, 1, height, (ctx, ox, oy) =>
        draw(ctx, ox, oy, index % 4, Math.floor(index / 4))
      )
    )
  );
  // Then the places people go to: shops, a church, a park and a stadium
  houses.push(
    [0, 1, 2, 3].map((color) =>
      makeSprite(createCanvas, 1, 22, (ctx, ox, oy) =>
        drawShops(ctx, ox, oy, color)
      )
    ),
    [makeSprite(createCanvas, 1, 60, drawChurch)],
    [0, 1, 2].map((variant) =>
      makeSprite(createCanvas, 1, 30, (ctx, ox, oy) =>
        drawPark(ctx, ox, oy, variant)
      )
    ),
    [makeSprite(createCanvas, 2, 44, drawStadium)]
  );

  const industry = (type: IndustryType) =>
    makeSprite(createCanvas, 2, 56, (ctx, ox, oy) =>
      INDUSTRY_ARTISTS[type](ctx, ox, oy, createRng(7))
    );

  return {
    trees,
    houses,
    industries: {
      coal_mine: industry("coal_mine"),
      power_station: industry("power_station"),
      forest: industry("forest"),
      sawmill: industry("sawmill"),
      farm: industry("farm"),
      factory: industry("factory"),
      oil_wells: industry("oil_wells"),
      refinery: industry("refinery"),
    },
  };
}
