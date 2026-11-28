// A theme is a different look for the same map. Every player picks their
// own: nothing about it is shared.
//
// The map is always drawn in the colors of the classic look. A theme can
// repaint those colors, change a few details of how shapes are drawn, and
// rework the finished picture.

type Rgb = readonly [red: number, green: number, blue: number];

export type Theme = {
  id: string;
  name: string;
  description: string;
  // Turns a color of the classic look into this theme's
  color: ((color: Rgb) => Rgb) | null;
  // Every face of a building or vehicle gets an outline in this color
  outline: string | null;
  // The lines between tiles, when they aren't the faint ones of the classic
  // look
  grid: string | null;
  // The color of windows with the lights on
  lights: string | null;
  // How many screen pixels wide each pixel of the map is, when it's more
  // than one. The picture is then also reduced to a few colors.
  pixel: number;
};

const luminance = ([red, green, blue]: Rgb) =>
  0.299 * red + 0.587 * green + 0.114 * blue;

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

function gray(color: Rgb): Rgb {
  const light = luminance(color);
  return [light, light, light];
}

const PLAIN = {
  color: null,
  outline: null,
  grid: null,
  lights: null,
  pixel: 1,
};

export const THEMES: Theme[] = [
  {
    ...PLAIN,
    id: "classic",
    name: "Classic",
    description: "Bright and clear, the way the game was first drawn",
  },
  {
    ...PLAIN,
    id: "pixel",
    name: "Pixel",
    description: "Big pixels and few colors, like a game from the nineties",
    pixel: 3,
  },
  {
    ...PLAIN,
    id: "night",
    name: "Night",
    description: "After dark, with the lights on in town",
    color: (color) => {
      const [red, green, blue] = mix(color, gray(color), 0.35);
      return [red * 0.28 + 8, green * 0.34 + 12, blue * 0.5 + 30];
    },
    lights: "#ffd66b",
  },
  {
    ...PLAIN,
    id: "winter",
    name: "Winter",
    description: "Snow on the ground and frost in the trees",
    color: (color) => {
      const [red, green, blue] = color;
      const light = luminance(color);
      if (green >= red && green > blue && green - blue > 24) {
        // Grass disappears under the snow, trees only get a dusting
        const snow = 205 + light * 0.18;
        return mix(
          color,
          [snow - 6, snow - 1, snow + 6],
          light > 120 ? 0.9 : 0.45
        );
      }
      if (red > 210 && green > 195 && red - blue > 50) {
        // Beaches
        return mix(color, [228, 232, 238], 0.75);
      }
      if (blue - red > 60 && blue > green) {
        // Water turns cold
        return mix(color, [128, 168, 196], 0.55);
      }
      return color;
    },
  },
  {
    ...PLAIN,
    id: "blueprint",
    name: "Blueprint",
    description: "White lines on blue paper, like an engineer's drawing",
    color: (color) =>
      mix([18, 58, 122], [120, 168, 232], (luminance(color) / 255) ** 1.4),
    outline: "rgba(226, 238, 255, 0.8)",
    grid: "rgba(226, 238, 255, 0.16)",
  },
  {
    ...PLAIN,
    id: "paper",
    name: "Paper",
    description: "Soft colors and ink lines, like a drawing in a picture book",
    color: (color) => {
      const [red, green, blue] = mix(
        mix(color, gray(color), 0.3),
        [255, 250, 236],
        0.3
      );
      return [red + 4, green, blue - 6];
    },
    outline: "rgba(58, 44, 36, 0.85)",
    grid: "rgba(58, 44, 36, 0.1)",
  },
];

// One theme is in use at a time, by everything that draws the map. It isn't
// handed around, as the functions that draw shapes are called from far too
// many places for that.
let theme = THEMES[0];
let inks = new Map<string, string>();

export function currentTheme() {
  return theme;
}

export function applyTheme(next: Theme) {
  if (next !== theme) {
    theme = next;
    inks = new Map();
  }
}

const channel = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));

// A #rrggbb or rgba() color of the classic look, as `theme` shows it
export function themeColor(theme: Theme, color: string) {
  if (!theme.color) {
    return color;
  }
  let rgb: Rgb;
  let alpha = 1;
  if (color.startsWith("#") && color.length === 7) {
    const value = parseInt(color.slice(1), 16);
    rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  } else {
    const parts = /^rgba?\(([^)]+)\)$/.exec(color)?.[1].split(",").map(Number);
    if (!parts || parts.length < 3 || parts.some(Number.isNaN)) {
      return color;
    }
    rgb = [parts[0], parts[1], parts[2]];
    alpha = parts[3] ?? 1;
  }
  const [red, green, blue] = theme.color(rgb).map(channel);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// The color to paint with, for a color of the classic look. Everything that
// is part of the map is painted through this. Labels and markers aren't:
// they look the same in every theme.
export function ink(color: string) {
  if (!theme.color) {
    return color;
  }
  let result = inks.get(color);
  if (result === undefined) {
    result = themeColor(theme, color);
    inks.set(color, result);
  }
  return result;
}

// Draws a line around the shape that was just filled, in themes that
// outline things
export function outline(ctx: CanvasRenderingContext2D) {
  if (theme.outline) {
    // Put back what was changed, as whoever filled the shape may be about
    // to draw lines of their own
    const { strokeStyle, lineWidth, lineJoin } = ctx;
    ctx.strokeStyle = theme.outline;
    ctx.lineWidth = 0.6;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = lineJoin;
  }
}

// How many shades of red, green and blue are left in a picture with big
// pixels
const SHADES = 8;
const STEP = 255 / (SHADES - 1);
// The order in which neighboring pixels round up, so that colors in between
// two shades become a fine pattern of both instead of a flat band. The
// pattern is kept faint: only colors close to halfway get one.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const PATTERN = 0.5;
// [place in the pattern][value] → the shade to use
const DITHER = BAYER.map((order) => {
  const shades = new Uint8ClampedArray(256);
  const nudge = ((order + 0.5) / BAYER.length - 0.5) * PATTERN;
  for (let value = 0; value < 256; value++) {
    shades[value] = Math.round(value / STEP + nudge) * STEP;
  }
  return shades;
});

// Reduces a picture to a few colors, the way old games had to
export function reduceColors(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  for (let y = 0, index = 0; y < height; y++) {
    for (let x = 0; x < width; x++, index += 4) {
      const shades = DITHER[(y & 3) * 4 + (x & 3)];
      data[index] = shades[data[index]];
      data[index + 1] = shades[data[index + 1]];
      data[index + 2] = shades[data[index + 2]];
    }
  }
  ctx.putImageData(image, 0, 0);
}
