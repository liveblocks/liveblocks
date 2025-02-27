/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { LiveObject } from "@liveblocks/client";
import { raise } from "@liveblocks/core";
import sharp from "sharp";

import { Liveblocks } from ".";

interface PixelColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Reads a PNG or JPG file and returns an array of pixel colors
 * @param filePath Path to the image file
 * @returns Promise resolving to an array of pixel colors
 */
async function readImageFile(filePath: string): Promise<PixelColor[]> {
  try {
    // Use sharp to read and process the image
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Get image dimensions
    const { width, height } = metadata;
    if (!width || !height) {
      throw new Error("Could not determine image dimensions");
    }

    // Extract raw pixel data (RGBA format)
    const rawBuffer = await image
      .raw()
      .ensureAlpha() // Make sure alpha channel is present
      .toBuffer();

    // Convert raw buffer to array of pixel objects
    const pixels: PixelColor[] = [];
    for (let i = 0; i < rawBuffer.length; i += 4) {
      pixels.push({
        r: rawBuffer[i]!,
        g: rawBuffer[i + 1]!,
        b: rawBuffer[i + 2]!,
        a: rawBuffer[i + 3]!,
      });
    }

    // console.log(
    //   `Read image with dimensions ${width}x${height}, total pixels: ${pixels.length}`
    // );
    return pixels;
  } catch (error) {
    throw new Error(`Error reading image file: ${String(error)}`);
  }
}

/**
 * Helper function to get pixel at specific coordinates
 * @param pixels Array of pixel colors
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Image width
 * @returns Pixel color at the specified coordinates
 */
function getPixelAt(
  pixels: PixelColor[],
  x: number,
  y: number,
  width: number
): string {
  const index = y * width + x;
  const pixel = pixels[index]!;

  // Convert RGB values to hex format
  const r = pixel.r.toString(16).padStart(2, "0");
  const g = pixel.g.toString(16).padStart(2, "0");
  const b = pixel.b.toString(16).padStart(2, "0");

  // Include alpha channel if it's not fully opaque
  if (pixel.a < 255) {
    const a = pixel.a.toString(16).padStart(2, "0");
    return `#${r}${g}${b}${a}`;
  }

  // Return standard RGB hex if fully opaque
  return `#${r}${g}${b}`;
}

function shuffle(input: number[]): number[] {
  const output = [...input];
  let i = output.length,
    rndi;

  // While there remain elements to shuffle...
  while (i !== 0) {
    // Pick a remaining element...
    rndi = Math.floor(Math.random() * i);
    i--;

    // And swap it with the current element.
    const item = output[i]!;
    output[i] = output[rndi]!;
    output[rndi] = item;
  }

  return output;
}

declare global {
  interface Liveblocks {
    Storage: {
      // [key: string]: Lson;
      migrationId?: number;
      pixelStorage: LiveObject<{
        [coord: string]: string;
      }>;
    };
  }
}

const liveblocks = new Liveblocks({
  secret:
    process.env.LIVEBLOCKS_SECRET_KEY ?? raise("Missing LIVEBLOCKS_SECRET_KEY"),
  baseUrl:
    process.env.LIVEBLOCKS_BASE_URL ?? raise("Missing LIVEBLOCKS_BASE_URL"),
});

const files = [
  "frank.png",
  "jax.png",
  "taco.png",
  "tajine.png",
  // "surfing.png",
];

await liveblocks.massMutateStorage(
  // "sveltekit-pixel-art-*",
  { query: "metadata['color']:'red'" },

  async ({ room, root }) => {
    console.log("===> Processing room", room.id);

    root.delete("migrationId");

    const pixels = await readImageFile(
      files[Math.floor(Math.random() * files.length)]!
    );
    const rndIndexes = shuffle(pixels.map((_v, i) => i));

    if (pixels.length !== 256) {
      throw new Error("Image must be 16x16 pixels");
    }

    // Painting...
    const grid = root.get("pixelStorage");
    for (let i = 0; i < 256; i++) {
      const rnd = rndIndexes[i]!;
      const x = rnd % 16;
      const y = Math.floor(rnd / 16);
      const coord = `0_${y}_${x}`;
      grid.set(coord, getPixelAt(pixels, x, y, 16));
      if (i % 16 === 0) {
        // flush();
        // await wait(70);
      }
    }
  }
);
