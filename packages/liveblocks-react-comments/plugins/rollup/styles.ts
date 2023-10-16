/* eslint-disable @typescript-eslint/no-unsafe-call */

import fs from "fs";
import { createRequire } from "module";
import path from "path";
import postcss from "postcss";
import type { Plugin } from "rollup";

import { colorMixScale } from "../../src/styles/color-mix-scale";

interface File {
  entry: string;
  destination: string;
}

interface Options {
  files: File[];
}

const require = createRequire(import.meta.url);

function createFile(file: string, data: string | NodeJS.ArrayBufferView) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

export function styles({ files }: Options): Plugin {
  return {
    name: "styles",
    buildStart: async () => {
      const processor = postcss([
        require("postcss-advanced-variables"),
        require("postcss-functions")({
          functions: {
            "color-mix-scale": colorMixScale,
          },
        }),
        require("postcss-import"),
        require("postcss-nesting"),
        require("postcss-combine-duplicated-selectors"),
        require("postcss-sort-media-queries"),
        require("postcss-lightningcss"),
      ]);

      for (const file of files) {
        console.log(`🎨 Building ${file.entry}…`);

        const entry = path.resolve(file.entry);
        const destination = path.resolve(file.destination);

        const { css, map } = await processor.process(
          fs.readFileSync(entry, "utf8"),
          {
            from: entry,
            to: destination,
            map: {
              inline: false,
            },
          }
        );

        createFile(destination, css);
        createFile(`${destination}.map`, map.toString());
      }
    },
  };
}
