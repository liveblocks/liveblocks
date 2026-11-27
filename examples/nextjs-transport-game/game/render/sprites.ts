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

export type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;

export type Sprites = {
  // [tree count - 1][variant]
  trees: Sprite[][];
  // [house variant][color]
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
  for (let attempt = 0; attempt < count * 6 && trees.length < count; attempt++) {
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

function drawCottage(ctx: Ctx, ox: number, oy: number, color: number) {
  const wall = WALLS[color % WALLS.length];
  const roof = ROOFS[color % ROOFS.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 19);
  box(ctx, ox, oy, 0.24, 0.24, 0.76, 0.76, 0, 8, wall);
  windowBand(ctx, ox, oy, "left", 0.44, 0.56, 0.76, 0, 5, "#7a5236");
  windowBand(ctx, ox, oy, "right", 0.36, 0.5, 0.76, 3, 6, GLASS);
  gableRoof(ctx, ox, oy, 0.2, 0.2, 0.8, 0.8, 8, 8, roof, wall, color % 2 === 0);
}

function drawTownhouse(ctx: Ctx, ox: number, oy: number, color: number) {
  const wall = WALLS[(color + 1) % WALLS.length];
  const roof = ROOFS[(color + 2) % ROOFS.length];
  groundShadow(ctx, ox, oy + HALF_H + 3, 22);
  box(ctx, ox, oy, 0.16, 0.16, 0.84, 0.84, 0, 18, wall, shade(roof, 0.9));
  for (const z of [4, 11]) {
    windowBand(ctx, ox, oy, "left", 0.24, 0.42, 0.84, z, z + 4, GLASS);
    windowBand(ctx, ox, oy, "left", 0.56, 0.74, 0.84, z, z + 4, GLASS);
    windowBand(ctx, ox, oy, "right", 0.24, 0.42, 0.84, z, z + 4, GLASS);
    windowBand(ctx, ox, oy, "right", 0.56, 0.74, 0.84, z, z + 4, GLASS);
  }
  box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 18, 19.5, shade(roof, 1.05));
}

function drawOffice(ctx: Ctx, ox: number, oy: number, color: number) {
  const wall = OFFICES[color % OFFICES.length];
  const height = 30 + (color % 3) * 5;
  groundShadow(ctx, ox, oy + HALF_H + 3, 23);
  box(ctx, ox, oy, 0.14, 0.14, 0.86, 0.86, 0, height, wall, shade(wall, 1.2));
  for (let z = 4; z + 4 < height; z += 6.5) {
    windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.86, z, z + 3.5, GLASS);
    windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.86, z, z + 3.5, GLASS);
  }
  box(ctx, ox, oy, 0.4, 0.4, 0.62, 0.62, height, height + 4, "#9aa3ad");
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
    windowBand(ctx, ox, oy, "left", from + 0.05, to - 0.05, to, z, z + 3, color);
    windowBand(ctx, ox, oy, "right", from + 0.05, to - 0.05, to, z, z + 3, color);
  }
}

const TOWERS = ["#d3d9df", "#e2d6c2", "#bccbd9", "#d9d2c6"];

function drawTower(ctx: Ctx, ox: number, oy: number, color: number) {
  const wall = TOWERS[color % TOWERS.length];
  const height = 56 + (color % 3) * 7;
  groundShadow(ctx, ox, oy + HALF_H + 3, 24);
  box(ctx, ox, oy, 0.12, 0.12, 0.88, 0.88, 0, 7, shade(wall, 0.8));
  windowBand(ctx, ox, oy, "left", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
  windowBand(ctx, ox, oy, "right", 0.2, 0.8, 0.88, 1.5, 5.5, GLASS);
  box(ctx, ox, oy, 0.18, 0.18, 0.82, 0.82, 7, height, wall, shade(wall, 1.15));
  floors(ctx, ox, oy, 0.18, 0.82, 7, height, GLASS);
  box(ctx, ox, oy, 0.34, 0.34, 0.6, 0.6, height, height + 5, "#8f98a3");
  box(ctx, ox, oy, 0.62, 0.4, 0.72, 0.5, height, height + 3, "#a9b1ba");
}

// [glass, frame] of each skyscraper
const SKYSCRAPERS = [
  ["#6f9cc4", "#dfe6ec"],
  ["#5fa6a2", "#e4e2d8"],
  ["#55647a", "#c6ccd4"],
  ["#8fb4d6", "#f0ead9"],
];

function drawSkyscraper(ctx: Ctx, ox: number, oy: number, color: number) {
  const [glass, frame] = SKYSCRAPERS[color % SKYSCRAPERS.length];
  const shaft = 84 + (color % 2) * 10;
  const crown = shaft + 20 + (color % 3) * 4;
  groundShadow(ctx, ox, oy + HALF_H + 3, 25);

  // A wide base, a glass shaft, and a narrower crown with a mast on top
  box(ctx, ox, oy, 0.1, 0.1, 0.9, 0.9, 0, 10, frame);
  windowBand(ctx, ox, oy, "left", 0.18, 0.82, 0.9, 2, 8, shade(glass, 0.8));
  windowBand(ctx, ox, oy, "right", 0.18, 0.82, 0.9, 2, 8, shade(glass, 0.8));
  box(ctx, ox, oy, 0.18, 0.18, 0.82, 0.82, 10, shaft, glass, frame);
  floors(ctx, ox, oy, 0.18, 0.82, 10, shaft, shade(glass, 1.45));
  for (const edge of [0.18, 0.5, 0.78]) {
    windowBand(ctx, ox, oy, "left", edge, edge + 0.04, 0.82, 10, shaft, frame);
    windowBand(ctx, ox, oy, "right", edge, edge + 0.04, 0.82, 10, shaft, frame);
  }
  box(ctx, ox, oy, 0.3, 0.3, 0.7, 0.7, shaft, crown, glass, frame);
  floors(ctx, ox, oy, 0.3, 0.7, shaft, crown, shade(glass, 1.45));
  box(ctx, ox, oy, 0.42, 0.42, 0.58, 0.58, crown, crown + 4, "#8f98a3");
  box(ctx, ox, oy, 0.485, 0.485, 0.515, 0.515, crown + 4, crown + 18, "#c8ced6");
  ctx.fillStyle = "#e5484d";
  ctx.fillRect(ox - 1, oy + HALF_H - crown - 20, 2, 2);
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
  ctx.quadraticCurveTo(px - rx * 0.3, py - height * 1.6, px + rx * 0.1, py - height);
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
      flat(ctx, ox, oy, 1.1 + offset - 0.1, 0.14, 1.1 + offset - 0.06, 0.88, "#bfa443");
      flat(ctx, ox, oy, 0.14, 1.1 + offset - 0.1, 0.88, 1.1 + offset - 0.06, "#ad8d38");
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

  // In the same order as `BUILDINGS`, with how tall each one can get
  const houseArtists = [
    { draw: drawCottage, height: 26 },
    { draw: drawTownhouse, height: 26 },
    { draw: drawOffice, height: 48 },
    { draw: drawTower, height: 80 },
    { draw: drawSkyscraper, height: 150 },
  ];
  const houses = houseArtists.map(({ draw, height }) =>
    [0, 1, 2, 3].map((color) =>
      makeSprite(createCanvas, 1, height, (ctx, ox, oy) =>
        draw(ctx, ox, oy, color)
      )
    )
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
