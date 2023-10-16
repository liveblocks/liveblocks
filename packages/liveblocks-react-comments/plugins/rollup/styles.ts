import fs from "fs";
import path from "path";
import postcss from "postcss";
import combineDuplicatedSelectors from "postcss-combine-duplicated-selectors";
import lightningcss from "postcss-lightningcss";
import sortMediaQueries from "postcss-sort-media-queries";
import type { Plugin } from "rollup";
import * as sass from "sass";

interface File {
  entry: string;
  destination: string;
}

interface Options {
  files: File[];
}

function createFile(file: string, data: string | NodeJS.ArrayBufferView) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

export function styles({ files }: Options): Plugin {
  return {
    name: "styles",
    buildStart() {
      const processor = postcss([
        sortMediaQueries(),
        combineDuplicatedSelectors(),
        lightningcss({ browsers: "last 2 versions and not dead" }),
      ]);
      for (const file of files) {
        console.log(`🎨 Building ${file.entry}…`);

        const entry = path.resolve(file.entry);
        const destination = path.resolve(file.destination);

        // Compiling Sass to CSS
        const { css: sassCss, sourceMap: sassSourceMap } = sass.compile(entry, {
          sourceMap: true,
        });

        // Optimizing CSS
        const { css, map } = processor.process(sassCss, {
          from: entry,
          to: destination,
          map: {
            prev: JSON.stringify(sassSourceMap),
            inline: false,
          },
        });

        createFile(destination, css);
        createFile(`${destination}.map`, map.toString());
      }
    },
  };
}
