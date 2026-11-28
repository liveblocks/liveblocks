import { TILE_H, TILE_W } from "../constants";
import { createRng, type Rng } from "../rng";
import type { Climate } from "../climate";
import type { IndustryType } from "../world";
import {
  box,
  type Ctx,
  cylinder,
  gableRoof,
  GLASS,
  HALF_H,
  HALF_W,
  hipRoof,
  quad,
  shade,
  windowBand,
} from "./shapes";
import { type Look, LOOKS } from "./looks";
import { currentTheme, ink, outline, type Theme } from "./theme";

// Everything that never changes (trees, houses, industries) is drawn once
// into a small off-screen canvas, then stamped onto the map every frame.
export type Sprite = {
  canvas: HTMLCanvasElement;
  // How many canvas pixels the picture has per world pixel, and the theme
  // it was drawn in
  scale: number;
  theme: Theme | null;
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
    // Big pixels need fewer of them
    currentTheme().pixel > 1 ? 1 : MIN_SPRITE_SCALE,
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
  sprite.theme = currentTheme();
}

// The sprite's picture, with this many pixels per world pixel. Each sprite
// only keeps one version, so memory use doesn't grow while zooming.
export function spriteImage(sprite: Sprite, scale: number) {
  if (sprite.scale !== scale || sprite.theme !== currentTheme()) {
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
    theme: null,
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
  ctx.fillStyle = ink(fill);
  ctx.fill();
  outline(ctx);
}

function groundShadow(ctx: Ctx, x: number, y: number, rx: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = ink("rgba(0, 0, 0, 0.16)");
  ctx.fill();
}

function drawTree(
  ctx: Ctx,
  x: number,
  y: number,
  conifer: boolean,
  scale: number
) {
  const { kind, color } = conifer ? look.conifer : look.leafy;
  groundShadow(ctx, x, y, (kind === "cactus" ? 4 : 6) * scale);

  if (kind === "cactus") {
    ctx.fillStyle = ink(color);
    ctx.beginPath();
    ctx.roundRect(
      x - 1.6 * scale,
      y - 12 * scale,
      3.2 * scale,
      12 * scale,
      1.6
    );
    ctx.roundRect(x - 5 * scale, y - 9 * scale, 2.2 * scale, 5 * scale, 1.1);
    ctx.roundRect(x - 5 * scale, y - 5.6 * scale, 4 * scale, 2 * scale, 1);
    ctx.roundRect(
      x + 2.8 * scale,
      y - 10.5 * scale,
      2.2 * scale,
      4.5 * scale,
      1.1
    );
    ctx.roundRect(x + 1 * scale, y - 7.6 * scale, 4 * scale, 2 * scale, 1);
    ctx.fill();
    outline(ctx);
    return;
  }

  if (kind === "palm") {
    const top = y - 15 * scale;
    ctx.strokeStyle = ink("#8a6a45");
    ctx.lineWidth = 1.8 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 2.5 * scale, y - 8 * scale, x + scale, top);
    ctx.stroke();
    // Fronds hang down all around the top of the trunk
    const fronds: [number, number, string][] = [
      [-8, 3, shade(color, 0.8)],
      [8.5, 3.5, shade(color, 0.8)],
      [-7, -3.5, color],
      [7.5, -3, color],
      [-3, 6, shade(color, 0.9)],
      [4, 6.5, shade(color, 0.9)],
      [0.5, -6, shade(color, 1.1)],
    ];
    ctx.lineWidth = 2.4 * scale;
    for (const [dx, dy, frond] of fronds) {
      ctx.strokeStyle = ink(frond);
      ctx.beginPath();
      ctx.moveTo(x + scale, top);
      ctx.quadraticCurveTo(
        x + scale + dx * 0.55 * scale,
        top + (dy - 5) * 0.6 * scale,
        x + scale + dx * scale,
        top + dy * scale
      );
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    return;
  }

  ctx.fillStyle = ink("#6b4a2b");
  ctx.fillRect(x - 1, y - 5 * scale, 2, 5 * scale);

  if (kind === "round") {
    circle(ctx, x, y - 10 * scale, 6.5 * scale, shade(color, 0.85));
    circle(ctx, x - 1.5 * scale, y - 11.5 * scale, 4.2 * scale, color);
    return;
  }

  for (let tier = 0; tier < 3; tier++) {
    const half = (6.5 - tier * 1.5) * scale;
    const base = y - (3 + tier * 5) * scale;
    ctx.beginPath();
    ctx.moveTo(x - half, base);
    ctx.lineTo(x + half, base);
    ctx.lineTo(x, base - 9 * scale);
    ctx.closePath();
    ctx.fillStyle = ink(shade(color, 0.8 + tier * 0.12));
    ctx.fill();
    if (kind === "snowy") {
      // Snow lies on the top of every layer of branches
      ctx.beginPath();
      ctx.moveTo(x - half * 0.62, base - 9 * scale * 0.38);
      ctx.lineTo(x - half * 0.2, base - 9 * scale * 0.3);
      ctx.lineTo(x + half * 0.15, base - 9 * scale * 0.42);
      ctx.lineTo(x + half * 0.62, base - 9 * scale * 0.38);
      ctx.lineTo(x, base - 9 * scale);
      ctx.closePath();
      ctx.fillStyle = ink("#f4f8fb");
      ctx.fill();
    }
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
      tree.scale
    );
  }
}

// The climate that the sprite being drawn is for. Sprites are drawn again
// when the map is zoomed in, long after they were made, so every sprite
// sets this itself before it draws.
let look: Look = LOOKS.normal;

const OFFICES = ["#cfd6de", "#d9cfc3", "#b9c7d6", "#e4dccb"];

const BRICK = "#9a6b55";
const DOOR = "#7a5236";

// How thick the slab of a flat roof is
const FLAT_ROOF = 2.5;

// The roof of a house: pitched, or a flat slab where houses are built
// that way
function houseGable(
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
  if (look.flatRoofs) {
    box(ctx, ox, oy, x0, y0, x1, y1, z, z + FLAT_ROOF, color);
  } else {
    gableRoof(
      ctx,
      ox,
      oy,
      x0,
      y0,
      x1,
      y1,
      z,
      rise,
      color,
      wallColor,
      ridgeAlongX
    );
  }
}

function houseHip(
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
  if (look.flatRoofs) {
    box(ctx, ox, oy, x0, y0, x1, y1, z, z + FLAT_ROOF, color);
  } else {
    hipRoof(ctx, ox, oy, x0, y0, x1, y1, z, rise, color);
  }
}

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
  if (look.flatRoofs) {
    return;
  }
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
  const wall = look.walls[(color + shape) % look.walls.length];
  const roof = look.roofs[color % look.roofs.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 19);

  if (shape === 1) {
    // A long bungalow
    box(ctx, ox, oy, 0.14, 0.3, 0.86, 0.72, 0, 7, wall);
    windowBand(ctx, ox, oy, "left", 0.22, 0.36, 0.72, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "left", 0.45, 0.55, 0.72, 0, 5, DOOR);
    windowBand(ctx, ox, oy, "left", 0.64, 0.78, 0.72, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.42, 0.6, 0.86, 2.5, 5.5, GLASS);
    houseGable(ctx, ox, oy, 0.1, 0.26, 0.9, 0.76, 7, 7, roof, wall);
    chimney(ctx, ox, oy, 0.24, 0.58, 10.5, 16);
  } else if (shape === 2) {
    // Two wings in an L
    box(ctx, ox, oy, 0.16, 0.18, 0.84, 0.54, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.22, 0.36, 0.54, 3, 6, GLASS);
    if (!look.flatRoofs) {
      gableRoof(ctx, ox, oy, 0.12, 0.14, 0.88, 0.58, 8, 7, roof, wall);
    }
    // Under one flat roof, the walls of both wings line up as well
    const side = look.flatRoofs ? 0.84 : 0.82;
    box(ctx, ox, oy, 0.46, 0.5, side, 0.86, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.56, 0.72, 0.86, 3, 6, GLASS);
    windowBand(ctx, ox, oy, "right", 0.62, 0.72, side, 0, 5, DOOR);
    if (look.flatRoofs) {
      // One slab over both wings, in two parts that share their far edge
      box(ctx, ox, oy, 0.12, 0.14, 0.88, 0.58, 8, 8 + FLAT_ROOF, roof);
      box(ctx, ox, oy, 0.42, 0.5, 0.88, 0.9, 8, 8 + FLAT_ROOF, roof);
    } else {
      gableRoof(ctx, ox, oy, 0.42, 0.46, 0.86, 0.9, 8, 7, roof, wall, false);
    }
  } else if (shape === 3) {
    // A square villa of two floors, under a roof that comes to a point
    box(ctx, ox, oy, 0.22, 0.22, 0.78, 0.78, 0, 13, wall);
    windowBand(ctx, ox, oy, "left", 0.45, 0.55, 0.78, 0, 5.5, DOOR);
    windowBand(ctx, ox, oy, "left", 0.28, 0.38, 0.78, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.3, 0.44, 0.78, 2.5, 5.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.56, 0.7, 0.78, 2.5, 5.5, GLASS);
    for (const side of ["left", "right"] as const) {
      windowBand(ctx, ox, oy, side, 0.3, 0.44, 0.78, 8, 11, GLASS);
      windowBand(ctx, ox, oy, side, 0.56, 0.7, 0.78, 8, 11, GLASS);
    }
    houseHip(ctx, ox, oy, 0.17, 0.17, 0.83, 0.83, 13, 9, roof);
  } else if (shape === 4) {
    // Two small houses that share a wall
    [0.1, 0.52].forEach((from, index) => {
      const own = look.walls[(color + shape + index) % look.walls.length];
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
      houseGable(
        ctx,
        ox,
        oy,
        from - 0.03,
        0.22,
        from + 0.41,
        0.82,
        8,
        7,
        look.roofs[(color + index) % look.roofs.length],
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
    houseGable(
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
      0.75
    );
    drawTree(
      ctx,
      ox + (0.36 - 0.82) * HALF_W,
      oy + (0.36 + 0.82) * HALF_H,
      color % 2 === 1,
      0.7
    );
    box(ctx, ox, oy, 0.08, 0.9, 0.94, 0.94, 0, 2.5, "#3f8a3a");
    box(ctx, ox, oy, 0.9, 0.08, 0.94, 0.9, 0, 2.5, "#3f8a3a");
  } else {
    box(ctx, ox, oy, 0.24, 0.24, 0.76, 0.76, 0, 8, wall);
    windowBand(ctx, ox, oy, "left", 0.44, 0.56, 0.76, 0, 5, DOOR);
    windowBand(ctx, ox, oy, "right", 0.36, 0.5, 0.76, 3, 6, GLASS);
    houseGable(
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
  const wall = look.walls[(color + 1 + shape) % look.walls.length];
  const roof = look.roofs[(color + 2) % look.roofs.length];
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
    houseGable(ctx, ox, oy, 0.1, 0.16, 0.9, 0.84, 15, 8, roof, wall);
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
    const upper = look.walls[(color + shape + 2) % look.walls.length];
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
    const stone = look.walls[(color + 3) % look.walls.length];
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
  ctx.fillStyle = ink("#e5484d");
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
  const wall = look.walls[(color + 2) % look.walls.length];
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
  flat(ctx, ox, oy, 0.05, 0.05, 0.95, 0.95, look.lawn);
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
  ctx.fillStyle = ink("#6f757d");
  ctx.fillRect(px - 0.7, py - 36, 1.4, 36);
  ctx.fillStyle = ink("#f4f1dc");
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
  ctx.fillStyle = ink(color);
  ctx.fill();
}

function derrick(ctx: Ctx, x: number, y: number, height: number) {
  groundShadow(ctx, x, y, 9);
  ctx.strokeStyle = ink("#3a3d42");
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
  ctx.fillStyle = ink("#3a3d42");
  ctx.fillRect(x - 2, y - height - 2, 4, 3);
}

// Where a point on the ground of a sprite is in its picture
function spot(ox: number, oy: number, x: number, y: number) {
  return { px: ox + (x - y) * HALF_W, py: oy + (x + y) * HALF_H };
}

function oval(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = ink(color);
  ctx.fill();
}

// A round building of snow or ice, built of rows of blocks
function dome(
  ctx: Ctx,
  ox: number,
  oy: number,
  cx: number,
  cy: number,
  radius: number,
  height: number,
  color: string
) {
  const { px, py } = spot(ox, oy, cx, cy);
  const rx = radius * Math.SQRT2 * HALF_W;
  const ry = radius * Math.SQRT2 * HALF_H;
  ctx.beginPath();
  ctx.ellipse(px, py, rx, height, 0, Math.PI, 0);
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = ink(color);
  ctx.fill();
  outline(ctx);
  ctx.strokeStyle = ink(shade(color, 0.82));
  ctx.lineWidth = 0.7;
  for (const level of [0.3, 0.58, 0.8]) {
    const narrow = Math.sqrt(1 - level * level);
    ctx.beginPath();
    ctx.ellipse(
      px,
      py - height * level,
      rx * narrow,
      ry * narrow,
      0,
      0,
      Math.PI
    );
    ctx.stroke();
  }
  // The way in, at the front
  ctx.beginPath();
  ctx.ellipse(
    px + rx * 0.25,
    py + ry * 0.8,
    rx * 0.2,
    height * 0.34,
    0,
    Math.PI,
    0
  );
  ctx.closePath();
  ctx.fillStyle = ink("#35576f");
  ctx.fill();
}

// A chimney that is wide at the bottom and narrow at the top
function cone(
  ctx: Ctx,
  ox: number,
  oy: number,
  cx: number,
  cy: number,
  radius: number,
  height: number,
  color: string
) {
  const { px, py } = spot(ox, oy, cx, cy);
  const rx = radius * Math.SQRT2 * HALF_W;
  const ry = radius * Math.SQRT2 * HALF_H;
  const top = rx * 0.3;
  ctx.beginPath();
  ctx.moveTo(px - rx, py);
  ctx.quadraticCurveTo(px - rx * 0.6, py - height * 0.6, px - top, py - height);
  ctx.lineTo(px + top, py - height);
  ctx.quadraticCurveTo(px + rx * 0.6, py - height * 0.6, px + rx, py);
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fillStyle = ink(color);
  ctx.fill();
  outline(ctx);
  // The side away from the light
  ctx.beginPath();
  ctx.moveTo(px + top, py - height);
  ctx.quadraticCurveTo(px + rx * 0.6, py - height * 0.6, px + rx, py);
  ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI / 2);
  ctx.lineTo(px, py - height);
  ctx.closePath();
  ctx.fillStyle = ink(shade(color, 0.8));
  ctx.fill();
  oval(ctx, px, py - height, top, top / 2, shade(color, 0.45));
}

// A cut stone, standing on its point
function gem(ctx: Ctx, x: number, y: number, size: number, color: string) {
  const half = size * 0.62;
  const waist = y - size * 1.25;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - half, waist);
  ctx.lineTo(x - half * 0.55, waist - size * 0.45);
  ctx.lineTo(x + half * 0.55, waist - size * 0.45);
  ctx.lineTo(x + half, waist);
  ctx.closePath();
  ctx.fillStyle = ink(color);
  ctx.fill();
  outline(ctx);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - half, waist);
  ctx.lineTo(x - half * 0.55, waist - size * 0.45);
  ctx.lineTo(x, waist - size * 0.45);
  ctx.lineTo(x - half * 0.2, waist);
  ctx.closePath();
  ctx.fillStyle = ink(shade(color, 1.45));
  ctx.fill();
}

// A few things hanging from a bar between two posts, along the x axis
function rack(
  ctx: Ctx,
  ox: number,
  oy: number,
  x0: number,
  x1: number,
  y: number,
  height: number,
  hung: (x: number, y: number) => void
) {
  const from = spot(ox, oy, x0, y);
  const to = spot(ox, oy, x1, y);
  ctx.strokeStyle = ink("#6b4a2b");
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(from.px, from.py);
  ctx.lineTo(from.px, from.py - height);
  ctx.lineTo(to.px, to.py - height);
  ctx.lineTo(to.px, to.py);
  ctx.stroke();
  for (const along of [0.2, 0.4, 0.6, 0.8]) {
    hung(
      from.px + (to.px - from.px) * along,
      from.py + (to.py - from.py) * along - height
    );
  }
}

const SNOW = "#f4f8fb";
const ICE = "#bfe6f2";
const ICE_TOP = "#e3f5fb";

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
    ground(ctx, ox, oy, shade(look.wooded, 0.9));
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
      ctx.fillStyle = ink("rgba(20, 20, 24, 0.55)");
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
    ctx.fillStyle = ink("#f59e0b");
    ctx.fill();
  },

  gold_mine(ctx, ox, oy) {
    ground(ctx, ox, oy, "#9c8f7a");
    mound(ctx, ox, oy, 0.55, 0.55, 0.42, 22, "#8a7c66");
    // The way into the hill
    box(ctx, ox, oy, 0.62, 0.86, 0.9, 0.96, 0, 9, "#6b4a2b", "#4a3a2c");
    windowBand(ctx, ox, oy, "left", 0.68, 0.84, 0.96, 0, 7, "#1f1c1a");
    // The winding tower over the shaft
    box(ctx, ox, oy, 1.3, 0.4, 1.62, 0.72, 0, 14, "#a58a66");
    box(ctx, ox, oy, 1.38, 0.48, 1.54, 0.64, 14, 40, "#55595f");
    cylinder(ctx, ox, oy, 1.46, 0.56, 0.12, 40, 43, "#3a3d42");
    box(ctx, ox, oy, 0.3, 1.25, 0.95, 1.7, 0, 9, "#b08a5e");
    gableRoof(ctx, ox, oy, 0.26, 1.21, 0.99, 1.74, 9, 6, "#6a5a4a", "#b08a5e");
    mound(ctx, ox, oy, 1.45, 1.45, 0.26, 9, "#e2b93b");
    mound(ctx, ox, oy, 1.6, 1.2, 0.16, 6, "#f0cf5a");
  },

  bank(ctx, ox, oy) {
    ground(ctx, ox, oy, "#b9b5ab");
    flat(ctx, ox, oy, 0.2, 1.5, 1.8, 1.9, "#cdc8bc");
    // Steps up to a front of columns under a pediment
    box(ctx, ox, oy, 0.22, 0.22, 1.78, 1.52, 0, 3, "#d8d2c4");
    box(ctx, ox, oy, 0.3, 0.3, 1.7, 1.4, 3, 26, "#ece5d3");
    for (let column = 0; column < 6; column++) {
      const x = 0.4 + column * 0.22;
      windowBand(ctx, ox, oy, "left", x, x + 0.1, 1.4, 5, 22, "#b9ae97");
    }
    windowBand(ctx, ox, oy, "left", 0.9, 1.1, 1.4, 3, 14, "#5a4632");
    for (const z of [7, 16]) {
      windowBand(ctx, ox, oy, "right", 0.42, 1.28, 1.7, z, z + 5, GLASS);
    }
    box(ctx, ox, oy, 0.26, 0.26, 1.74, 1.44, 26, 29, "#d8d2c4");
    gableRoof(
      ctx,
      ox,
      oy,
      0.26,
      0.26,
      1.74,
      1.44,
      29,
      8,
      "#8f9aa3",
      "#ece5d3",
      false
    );
  },

  copper_mine(ctx, ox, oy) {
    ground(ctx, ox, oy, "#b89468");
    // An open pit, dug down in steps
    flat(ctx, ox, oy, 0.15, 0.15, 1.2, 1.2, "#a67c52");
    flat(ctx, ox, oy, 0.3, 0.3, 1.05, 1.05, "#8f6541");
    flat(ctx, ox, oy, 0.45, 0.45, 0.9, 0.9, "#754f33");
    flat(ctx, ox, oy, 0.58, 0.58, 0.78, 0.78, "#5c3d28");
    box(ctx, ox, oy, 1.35, 0.3, 1.75, 0.8, 0, 16, "#8d9197", "#6f7379");
    box(ctx, ox, oy, 1.42, 0.8, 1.62, 1.35, 6, 9, "#55595f");
    mound(ctx, ox, oy, 1.5, 1.5, 0.3, 12, "#b5673c");
    mound(ctx, ox, oy, 0.6, 1.6, 0.22, 8, "#9a5a36");
    box(ctx, ox, oy, 0.95, 1.5, 1.2, 1.8, 0, 6, "#d9c9a6", "#8a6a4c");
  },

  smelter(ctx, ox, oy) {
    ground(ctx, ox, oy, "#9f9c95");
    for (const x of [0.4, 0.8]) {
      cylinder(ctx, ox, oy, x, 0.4, 0.1, 0, 46, "#7d6a60", "#2f2a28");
      cylinder(ctx, ox, oy, x, 0.4, 0.1, 36, 39, "#d8d2c4");
    }
    box(ctx, ox, oy, 0.2, 0.7, 1.4, 1.75, 0, 20, "#8a5f4c", "#6d7177");
    // Light of the furnaces inside
    windowBand(ctx, ox, oy, "left", 0.35, 0.65, 1.75, 0, 9, "#f59e0b");
    windowBand(ctx, ox, oy, "left", 0.85, 1.25, 1.75, 11, 16, GLASS);
    windowBand(ctx, ox, oy, "right", 0.85, 1.6, 1.4, 11, 16, GLASS);
    gableRoof(ctx, ox, oy, 0.2, 0.7, 1.4, 1.75, 20, 5, "#5d6167", "#8a5f4c");
    cylinder(ctx, ox, oy, 1.6, 0.5, 0.2, 0, 18, "#b9bec4");
    mound(ctx, ox, oy, 1.65, 1.5, 0.2, 8, "#b5673c");
  },

  water_supply(ctx, ox, oy) {
    ground(ctx, ox, oy, "#d9c48e");
    // A spring, and the pond it fills
    const px = ox + (0.75 - 0.8) * HALF_W;
    const py = oy + (0.75 + 0.8) * HALF_H;
    ctx.beginPath();
    ctx.ellipse(px, py, 24, 11, 0, 0, Math.PI * 2);
    ctx.fillStyle = ink("#7aa36a");
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px, py, 20, 8.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = ink(look.water);
    ctx.fill();
    drawTree(ctx, px - 22, py - 2, false, 0.9);
    drawTree(ctx, px + 4, py - 11, false, 0.75);
    // A wind pump
    const wx = ox + (1.5 - 0.5) * HALF_W;
    const wy = oy + (1.5 + 0.5) * HALF_H;
    derrick(ctx, wx, wy, 34);
    circle(ctx, wx, wy - 35, 7, "#c9ced4");
    circle(ctx, wx, wy - 35, 1.8, "#3a3d42");
    box(ctx, ox, oy, 1.25, 1.3, 1.75, 1.72, 0, 9, "#eadfc6", "#a7adb4");
    cylinder(ctx, ox, oy, 1.02, 1.55, 0.13, 0, 9, "#b9bec4", "#8fbfe0");
  },

  water_tower(ctx, ox, oy) {
    ground(ctx, ox, oy, "#cdbb8c");
    for (const [x, y] of [
      [0.62, 0.62],
      [1.02, 0.62],
      [0.62, 1.02],
      [1.02, 1.02],
    ]) {
      cylinder(ctx, ox, oy, x, y, 0.035, 0, 30, "#6f757c");
    }
    cylinder(ctx, ox, oy, 0.82, 0.82, 0.07, 0, 30, "#8d9399");
    cylinder(ctx, ox, oy, 0.82, 0.82, 0.38, 30, 46, "#dfe6ea", "#c2ccd2");
    cylinder(ctx, ox, oy, 0.82, 0.82, 0.38, 36, 39, "#5aa7d8");
    cylinder(ctx, ox, oy, 0.82, 0.82, 0.1, 46, 49, "#a7adb4");
    box(ctx, ox, oy, 1.3, 1.25, 1.75, 1.7, 0, 9, "#eadfc6", "#b98a62");
    windowBand(ctx, ox, oy, "left", 1.45, 1.6, 1.7, 0, 6, DOOR);
    cylinder(ctx, ox, oy, 0.45, 1.55, 0.16, 0, 8, "#b9bec4", "#8fbfe0");
  },

  plantation(ctx, ox, oy) {
    ground(ctx, ox, oy, "#6fae4e");
    // Fruit trees in rows
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        if (row > 1 && column > 1) {
          continue;
        }
        const x = 0.26 + column * 0.42;
        const y = 0.26 + row * 0.42;
        const px = ox + (x - y) * HALF_W;
        const py = oy + (x + y) * HALF_H;
        groundShadow(ctx, px, py, 6);
        ctx.fillStyle = ink("#6b4a2b");
        ctx.fillRect(px - 1, py - 5, 2, 5);
        circle(ctx, px, py - 9, 6, "#3f8f3a");
        for (const [dx, dy] of [
          [-2.5, -1],
          [2, 1.5],
          [0.5, -3.5],
        ]) {
          circle(ctx, px + dx, py - 9 + dy, 1.3, "#f08a2c");
        }
      }
    }
    box(ctx, ox, oy, 1.2, 1.25, 1.8, 1.75, 0, 9, "#e9d9b0");
    windowBand(ctx, ox, oy, "left", 1.4, 1.6, 1.75, 0, 6, "#7a5236");
    gableRoof(ctx, ox, oy, 1.15, 1.2, 1.85, 1.8, 9, 7, "#b5533c", "#e9d9b0");
  },

  food_plant(ctx, ox, oy) {
    ground(ctx, ox, oy, "#aaa69d");
    for (const x of [0.38, 0.72, 1.06]) {
      cylinder(ctx, ox, oy, x, 0.4, 0.15, 0, 30, "#e3e6e8", "#bfc5ca");
    }
    box(ctx, ox, oy, 0.2, 0.75, 1.45, 1.8, 0, 16, "#f0ede4", "#b9bec4");
    box(ctx, ox, oy, 0.2, 0.75, 1.45, 1.8, 16, 18, "#3f8fbf", "#b9bec4");
    windowBand(ctx, ox, oy, "left", 0.3, 1.35, 1.8, 7, 11, GLASS);
    windowBand(ctx, ox, oy, "right", 0.85, 1.7, 1.45, 7, 11, GLASS);
    windowBand(ctx, ox, oy, "left", 0.5, 0.8, 1.8, 0, 5, "#55595f");
    box(ctx, ox, oy, 1.45, 1.15, 1.85, 1.8, 0, 9, "#d9d4c6", "#9da2a7");
    cylinder(ctx, ox, oy, 1.6, 0.5, 0.07, 0, 36, "#b9bec4", "#4a4a4a");
  },

  fishing_camp(ctx, ox, oy) {
    ground(ctx, ox, oy, "#e6edf2");
    // A frozen lake, with holes cut in the ice to fish through
    const lake = spot(ox, oy, 0.82, 0.86);
    oval(ctx, lake.px, lake.py, 29, 13, "#d3e5ee");
    oval(ctx, lake.px, lake.py, 25, 11, "#b5d6e8");
    for (const [dx, dy] of [
      [-13, 1],
      [-2, 6],
      [13, -1],
    ]) {
      oval(ctx, lake.px + dx, lake.py + dy, 3.2, 1.6, "#2f5d82");
    }
    // Huts out on the ice
    box(ctx, ox, oy, 0.5, 0.42, 0.72, 0.64, 0, 7, "#b9543f");
    gableRoof(ctx, ox, oy, 0.47, 0.39, 0.75, 0.67, 7, 4, SNOW, "#b9543f");
    box(ctx, ox, oy, 0.98, 0.84, 1.18, 1.04, 0, 7, "#3f7fa6");
    gableRoof(ctx, ox, oy, 0.95, 0.81, 1.21, 1.07, 7, 4, SNOW, "#3f7fa6");
    rack(ctx, ox, oy, 1.3, 1.85, 0.5, 11, (x, y) => {
      oval(ctx, x, y + 3.5, 1.1, 3, "#9fb6c4");
    });
    box(ctx, ox, oy, 1.22, 1.25, 1.8, 1.72, 0, 10, "#8a6a55");
    windowBand(ctx, ox, oy, "left", 1.42, 1.58, 1.72, 0, 6, DOOR);
    gableRoof(ctx, ox, oy, 1.18, 1.21, 1.84, 1.76, 10, 7, SNOW, "#8a6a55");
    box(ctx, ox, oy, 0.4, 1.5, 0.62, 1.72, 0, 4, "#c9a36b");
    box(ctx, ox, oy, 0.66, 1.56, 0.86, 1.76, 0, 4, "#b98f58");
  },

  cannery(ctx, ox, oy) {
    ground(ctx, ox, oy, "#d5dde3");
    cylinder(ctx, ox, oy, 0.42, 0.32, 0.09, 0, 42, "#9a4f43", "#3a3d42");
    cylinder(ctx, ox, oy, 1.62, 0.48, 0.2, 0, 18, "#c9ced4");
    box(ctx, ox, oy, 0.2, 0.6, 1.42, 1.8, 0, 15, "#4f7f9c");
    windowBand(ctx, ox, oy, "left", 0.3, 0.5, 1.8, 0, 7, "#33414c");
    windowBand(ctx, ox, oy, "left", 0.62, 1.32, 1.8, 7, 11, GLASS);
    windowBand(ctx, ox, oy, "right", 0.75, 1.65, 1.42, 7, 11, GLASS);
    gableRoof(ctx, ox, oy, 0.16, 0.56, 1.46, 1.84, 15, 7, SNOW, "#4f7f9c");
    // Crates of tins, ready to go
    box(ctx, ox, oy, 1.54, 1.15, 1.8, 1.41, 0, 5, "#c9a36b");
    box(ctx, ox, oy, 1.54, 1.46, 1.8, 1.72, 0, 5, "#b98f58");
    box(ctx, ox, oy, 1.58, 1.28, 1.78, 1.56, 5, 9, "#d1ad76");
  },

  ice_quarry(ctx, ox, oy) {
    ground(ctx, ox, oy, "#e6edf2");
    // A frozen lake, sawn out block by block down to the water
    flat(ctx, ox, oy, 0.12, 0.12, 1.26, 1.26, "#cfe6f1");
    flat(ctx, ox, oy, 0.28, 0.28, 1.1, 1.1, "#a9d3e6");
    flat(ctx, ox, oy, 0.44, 0.44, 0.94, 0.94, "#7fb7d3");
    flat(ctx, ox, oy, 0.58, 0.58, 0.8, 0.8, "#4f86bd");
    for (const [x, y, z] of [
      [1.4, 0.26, 0],
      [1.64, 0.26, 0],
      [1.52, 0.26, 6],
      [1.4, 0.56, 0],
      [1.64, 0.56, 0],
    ]) {
      box(ctx, ox, oy, x, y, x + 0.22, y + 0.22, z, z + 6, ICE, ICE_TOP);
    }
    const crane = spot(ox, oy, 1.02, 1.5);
    derrick(ctx, crane.px, crane.py, 26);
    box(ctx, ox, oy, 1.3, 1.3, 1.78, 1.72, 0, 9, "#b9543f");
    windowBand(ctx, ox, oy, "left", 1.46, 1.6, 1.72, 0, 6, DOOR);
    gableRoof(ctx, ox, oy, 1.26, 1.26, 1.82, 1.76, 9, 6, SNOW, "#b9543f");
    // A sled with a block on it
    box(ctx, ox, oy, 0.34, 1.52, 0.78, 1.74, 0, 2, "#8a6a45");
    box(ctx, ox, oy, 0.44, 1.54, 0.68, 1.72, 2, 8, ICE, ICE_TOP);
  },

  ice_hotel(ctx, ox, oy) {
    ground(ctx, ox, oy, "#e6edf2");
    dome(ctx, ox, oy, 0.84, 0.8, 0.52, 32, "#dff1f8");
    const flag = spot(ox, oy, 0.84, 0.8);
    ctx.strokeStyle = ink("#55595f");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(flag.px, flag.py - 32);
    ctx.lineTo(flag.px, flag.py - 44);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(flag.px, flag.py - 44);
    ctx.lineTo(flag.px + 8, flag.py - 41.5);
    ctx.lineTo(flag.px, flag.py - 39);
    ctx.closePath();
    ctx.fillStyle = ink("#c8553d");
    ctx.fill();
    dome(ctx, ox, oy, 1.56, 0.62, 0.27, 17, "#d3ebf5");
    dome(ctx, ox, oy, 0.6, 1.56, 0.27, 17, "#e9f6fb");
    // A hall of ice blocks, with a light on inside
    box(ctx, ox, oy, 1.24, 1.24, 1.8, 1.74, 0, 12, ICE, ICE_TOP);
    windowBand(ctx, ox, oy, "left", 1.32, 1.5, 1.74, 0, 8, "#35576f");
    windowBand(ctx, ox, oy, "left", 1.58, 1.72, 1.74, 4, 8, "#f6d77a");
    windowBand(ctx, ox, oy, "right", 1.34, 1.64, 1.8, 4, 8, "#f6d77a");
  },

  sand_pit(ctx, ox, oy) {
    ground(ctx, ox, oy, "#e6cf96");
    flat(ctx, ox, oy, 0.14, 0.14, 1.24, 1.24, "#d9bd7c");
    flat(ctx, ox, oy, 0.3, 0.3, 1.08, 1.08, "#c9a965");
    flat(ctx, ox, oy, 0.46, 0.46, 0.92, 0.92, "#b89552");
    // A digger down in the pit
    box(ctx, ox, oy, 0.56, 0.6, 0.8, 0.78, 0, 4, "#3a3d42");
    box(ctx, ox, oy, 0.58, 0.6, 0.78, 0.76, 4, 8, "#e2a52b");
    box(ctx, ox, oy, 0.58, 0.6, 0.68, 0.7, 8, 12, "#f0c040");
    const arm = spot(ox, oy, 0.76, 0.76);
    ctx.strokeStyle = ink("#c98a1f");
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(arm.px, arm.py - 8);
    ctx.lineTo(arm.px + 7, arm.py - 13);
    ctx.lineTo(arm.px + 11, arm.py - 2);
    ctx.stroke();
    mound(ctx, ox, oy, 1.56, 0.56, 0.3, 15, "#f0dfb4");
    // A belt carries the sand up into a hopper
    box(ctx, ox, oy, 0.86, 1.42, 1.3, 1.52, 5, 7, "#55595f");
    box(ctx, ox, oy, 1.3, 1.34, 1.52, 1.6, 0, 12, "#d98a2b", "#b36f1f");
    mound(ctx, ox, oy, 0.5, 1.58, 0.24, 9, "#ead29a");
    box(ctx, ox, oy, 1.58, 1.5, 1.84, 1.8, 0, 7, "#eadfc6", "#a7adb4");
  },

  glassworks(ctx, ox, oy) {
    ground(ctx, ox, oy, "#b9ad95");
    // The furnace stands inside a tall cone of brick
    cone(ctx, ox, oy, 0.62, 0.62, 0.4, 46, "#a8644a");
    const glow = spot(ox, oy, 0.74, 0.98);
    ctx.beginPath();
    ctx.ellipse(glow.px, glow.py, 4, 7, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = ink("#f59e0b");
    ctx.fill();
    mound(ctx, ox, oy, 1.56, 0.46, 0.22, 8, "#ead29a");
    box(ctx, ox, oy, 1, 0.92, 1.8, 1.76, 0, 14, "#b9785a", "#8e9296");
    windowBand(ctx, ox, oy, "left", 1.08, 1.72, 1.76, 3, 11, "#a9d9ea");
    windowBand(ctx, ox, oy, "right", 1, 1.68, 1.8, 3, 11, "#a9d9ea");
    // Panes of glass, standing in a rack
    for (const y of [1.42, 1.54, 1.66]) {
      box(ctx, ox, oy, 0.28, y, 0.76, y + 0.04, 0, 9, ICE, ICE_TOP);
    }
  },

  rubber_plantation(ctx, ox, oy) {
    ground(ctx, ox, oy, "#5f9c46");
    // Tall, thin trees in rows, each with a cut in its bark and a cup
    // under it
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        if (row > 1 && column > 1) {
          continue;
        }
        const { px, py } = spot(
          ox,
          oy,
          0.26 + column * 0.42,
          0.26 + row * 0.42
        );
        groundShadow(ctx, px, py, 5);
        ctx.fillStyle = ink("#b9ad9a");
        ctx.fillRect(px - 1, py - 14, 2, 14);
        ctx.fillStyle = ink("#ffffff");
        ctx.fillRect(px - 1.6, py - 7, 3.2, 1.2);
        ctx.fillStyle = ink("#55595f");
        ctx.fillRect(px - 1.6, py - 5, 3.2, 2);
        circle(ctx, px, py - 17, 5.5, "#2f7d3a");
        circle(ctx, px - 1.5, py - 18.5, 3.3, "#3f9447");
      }
    }
    // Sheets of rubber, hung out to dry
    rack(ctx, ox, oy, 1.15, 1.85, 1.2, 10, (x, y) => {
      ctx.fillStyle = ink("#ecdcae");
      ctx.fillRect(x - 2.2, y, 4.4, 7);
    });
    box(ctx, ox, oy, 1.22, 1.36, 1.8, 1.78, 0, 8, "#d9c9a6");
    windowBand(ctx, ox, oy, "left", 1.42, 1.58, 1.78, 0, 6, DOOR);
    gableRoof(ctx, ox, oy, 1.18, 1.32, 1.84, 1.82, 8, 6, "#6f7f52", "#d9c9a6");
  },

  tyre_factory(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a5a39c");
    cylinder(ctx, ox, oy, 0.42, 0.36, 0.1, 0, 44, "#8d9399", "#3a3d42");
    box(ctx, ox, oy, 0.2, 0.65, 1.38, 1.8, 0, 17, "#d8d4c8", "#6f7379");
    box(ctx, ox, oy, 0.2, 0.65, 1.38, 1.8, 17, 19, "#e2a52b", "#6f7379");
    windowBand(ctx, ox, oy, "left", 0.3, 0.55, 1.8, 0, 7, "#55595f");
    windowBand(ctx, ox, oy, "left", 0.68, 1.28, 1.8, 8, 12, GLASS);
    windowBand(ctx, ox, oy, "right", 0.75, 1.7, 1.38, 8, 12, GLASS);
    // Tyres, in stacks
    const stacks: [number, number, number][] = [
      [1.64, 0.42, 4],
      [1.64, 0.74, 3],
      [1.6, 1.26, 5],
      [1.5, 1.6, 2],
      [1.76, 1.58, 3],
    ];
    for (const [x, y, count] of stacks) {
      for (let tyre = 0; tyre < count; tyre++) {
        cylinder(
          ctx,
          ox,
          oy,
          x,
          y,
          0.11,
          tyre * 3.2,
          tyre * 3.2 + 2.8,
          "#2b2b2e",
          "#3a3a3e"
        );
      }
      const top = (count - 1) * 3.2 + 2.8;
      cylinder(ctx, ox, oy, x, y, 0.05, top, top, "#8d9399", "#8d9399");
    }
  },

  cocoa_farm(ctx, ox, oy) {
    ground(ctx, ox, oy, "#6aa84f");
    // Low trees, with the pods growing straight from their trunks
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        if (row === 2 && column === 2) {
          continue;
        }
        const { px, py } = spot(ox, oy, 0.28 + column * 0.4, 0.28 + row * 0.5);
        groundShadow(ctx, px, py, 6.5);
        ctx.fillStyle = ink("#6b4a2b");
        ctx.fillRect(px - 1.3, py - 9, 2.6, 9);
        circle(ctx, px, py - 13, 6.8, "#3c8a3c");
        circle(ctx, px - 2, py - 14.5, 4.2, "#4c9c46");
        oval(ctx, px - 2.4, py - 5.5, 1.3, 2.2, "#e2b93b");
        oval(ctx, px + 2.4, py - 3.6, 1.3, 2.2, "#c8553d");
        oval(ctx, px + 2, py - 8, 1.2, 2, "#e08a2c");
      }
    }
    // Beans drying in the sun
    box(ctx, ox, oy, 1.42, 0.24, 1.84, 0.56, 0, 2.5, "#b9a27c", "#6b3f24");
    box(ctx, ox, oy, 1.42, 0.64, 1.84, 0.96, 0, 2.5, "#b9a27c", "#7a4a2b");
    box(ctx, ox, oy, 1.2, 1.24, 1.78, 1.72, 0, 8, "#d9b98c");
    windowBand(ctx, ox, oy, "left", 1.4, 1.56, 1.72, 0, 6, DOOR);
    hipRoof(ctx, ox, oy, 1.13, 1.17, 1.85, 1.79, 8, 9, "#c9a85a");
    cylinder(ctx, ox, oy, 0.98, 1.62, 0.08, 0, 5, "#c9b48a");
    cylinder(ctx, ox, oy, 0.8, 1.7, 0.08, 0, 5, "#bfa878");
  },

  chocolate_factory(ctx, ox, oy) {
    ground(ctx, ox, oy, "#a8a49c");
    cylinder(ctx, ox, oy, 0.42, 0.36, 0.1, 0, 44, "#b9785a", "#4a3a35");
    cylinder(ctx, ox, oy, 0.42, 0.36, 0.1, 34, 37, "#f3ead9");
    cylinder(ctx, ox, oy, 1.6, 0.48, 0.22, 0, 16, "#e9dcc3", "#c9b99a");
    box(ctx, ox, oy, 0.2, 0.65, 1.35, 1.8, 0, 18, "#7a4a2b", "#8e9296");
    box(ctx, ox, oy, 0.2, 0.65, 1.35, 1.8, 18, 20, "#f3ead9", "#8e9296");
    for (const z of [4, 11]) {
      windowBand(ctx, ox, oy, "left", 0.3, 1.25, 1.8, z, z + 4, "#f3d9a0");
      windowBand(ctx, ox, oy, "right", 0.75, 1.7, 1.35, z, z + 4, "#f3d9a0");
    }
    windowBand(ctx, ox, oy, "left", 0.68, 0.9, 1.8, 0, 8, "#3f2616");
    box(ctx, ox, oy, 1.35, 1.1, 1.82, 1.8, 0, 10, "#f3ead9", "#9a9ea2");
    windowBand(ctx, ox, oy, "right", 1.2, 1.7, 1.82, 3, 7, "#c8553d");
  },

  gem_mine(ctx, ox, oy) {
    ground(ctx, ox, oy, "#8a9a6a");
    mound(ctx, ox, oy, 0.6, 0.58, 0.46, 26, "#6f7a66");
    // The way into the hill, and the rails that come out of it
    box(ctx, ox, oy, 0.64, 0.9, 0.94, 1, 0, 9, "#6b4a2b", "#4a3a2c");
    windowBand(ctx, ox, oy, "left", 0.71, 0.87, 1, 0, 7, "#1f1c1a");
    flat(ctx, ox, oy, 0.75, 1, 0.83, 1.8, "#6f6a60");
    box(ctx, ox, oy, 0.71, 1.4, 0.87, 1.6, 1, 5, "#8d9399", "#2fae77");
    const vein = spot(ox, oy, 1.5, 0.52);
    mound(ctx, ox, oy, 1.5, 0.52, 0.26, 7, "#7d8778");
    gem(ctx, vein.px - 6, vein.py - 1, 5, "#2fae77");
    gem(ctx, vein.px + 1, vein.py - 3, 7.5, "#27a06c");
    gem(ctx, vein.px + 8, vein.py + 1, 4, "#3cc48a");
    box(ctx, ox, oy, 1.24, 1.2, 1.8, 1.7, 0, 9, "#b08a5e");
    windowBand(ctx, ox, oy, "left", 1.44, 1.6, 1.7, 0, 6, DOOR);
    gableRoof(ctx, ox, oy, 1.2, 1.16, 1.84, 1.74, 9, 6, "#5f7a4a", "#b08a5e");
    const heap = spot(ox, oy, 0.36, 1.6);
    mound(ctx, ox, oy, 0.36, 1.6, 0.18, 5, "#7d8778");
    gem(ctx, heap.px, heap.py, 4, "#2fae77");
  },

  jeweller(ctx, ox, oy) {
    ground(ctx, ox, oy, "#b9b5ab");
    flat(ctx, ox, oy, 0.2, 1.5, 1.8, 1.9, "#cdc8bc");
    box(ctx, ox, oy, 0.3, 0.3, 1.7, 1.45, 0, 20, "#f1ebe0");
    // Shop windows under an awning
    windowBand(ctx, ox, oy, "left", 0.4, 0.82, 1.45, 2, 9, "#bfe3ee");
    windowBand(ctx, ox, oy, "left", 0.92, 1.08, 1.45, 0, 9, "#3a4a3f");
    windowBand(ctx, ox, oy, "left", 1.18, 1.6, 1.45, 2, 9, "#bfe3ee");
    windowBand(ctx, ox, oy, "right", 0.45, 1.3, 1.7, 2, 9, "#bfe3ee");
    box(ctx, ox, oy, 0.34, 1.45, 1.66, 1.56, 10, 12, "#1f6b4d", "#2a8a63");
    for (const from of [0.45, 0.88, 1.31]) {
      windowBand(ctx, ox, oy, "left", from, from + 0.24, 1.45, 14, 18, GLASS);
    }
    windowBand(ctx, ox, oy, "right", 0.45, 0.8, 1.7, 14, 18, GLASS);
    windowBand(ctx, ox, oy, "right", 0.95, 1.3, 1.7, 14, 18, GLASS);
    box(ctx, ox, oy, 0.26, 0.26, 1.74, 1.49, 20, 22, "#d8d2c4");
    // An emerald the size of a car, up on the roof
    box(ctx, ox, oy, 0.9, 0.78, 1.1, 0.98, 22, 25, "#8d9399");
    const sign = spot(ox, oy, 1, 0.88);
    gem(ctx, sign.px, sign.py - 25, 11, "#2fae77");
  },
};

export function createSprites(
  createCanvas: CanvasFactory,
  climate: Climate
): Sprites {
  const mine = LOOKS[climate];
  const make = (
    tiles: number,
    height: number,
    draw: (ctx: Ctx, ox: number, oy: number) => void
  ): Sprite =>
    makeSprite(createCanvas, tiles, height, (ctx, ox, oy) => {
      look = mine;
      draw(ctx, ox, oy);
    });

  // Randomly placed details start from a fixed seed per sprite, so that a
  // sprite looks the same every time it's drawn
  const trees: Sprite[][] = [];
  for (let count = 1; count <= 3; count++) {
    const variants: Sprite[] = [];
    for (let variant = 0; variant < 4; variant++) {
      const seed = 7 + count * 4 + variant;
      const conifers = variant % 2 === 0 ? 0.75 : 0.25;
      variants.push(
        make(1, 30, (ctx, ox, oy) =>
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
      make(1, height, (ctx, ox, oy) =>
        draw(ctx, ox, oy, index % 4, Math.floor(index / 4))
      )
    )
  );
  // Then the places people go to: shops, a church, a park and a stadium
  houses.push(
    [0, 1, 2, 3].map((color) =>
      make(1, 22, (ctx, ox, oy) => drawShops(ctx, ox, oy, color))
    ),
    [make(1, 60, drawChurch)],
    [0, 1, 2].map((variant) =>
      make(1, 30, (ctx, ox, oy) => drawPark(ctx, ox, oy, variant))
    ),
    [make(2, 44, drawStadium)]
  );

  const industry = (type: IndustryType) =>
    make(2, 56, (ctx, ox, oy) =>
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
      gold_mine: industry("gold_mine"),
      bank: industry("bank"),
      copper_mine: industry("copper_mine"),
      smelter: industry("smelter"),
      water_supply: industry("water_supply"),
      water_tower: industry("water_tower"),
      plantation: industry("plantation"),
      food_plant: industry("food_plant"),
      fishing_camp: industry("fishing_camp"),
      cannery: industry("cannery"),
      ice_quarry: industry("ice_quarry"),
      ice_hotel: industry("ice_hotel"),
      sand_pit: industry("sand_pit"),
      glassworks: industry("glassworks"),
      rubber_plantation: industry("rubber_plantation"),
      tyre_factory: industry("tyre_factory"),
      cocoa_farm: industry("cocoa_farm"),
      chocolate_factory: industry("chocolate_factory"),
      gem_mine: industry("gem_mine"),
      jeweller: industry("jeweller"),
    },
  };
}
