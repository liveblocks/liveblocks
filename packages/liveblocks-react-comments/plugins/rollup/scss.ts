import browserslist from "browserslist";
import fs from "fs";
import { browserslistToTargets, transform } from "lightningcss";
import path from "path";
import type { Plugin } from "rollup";
import * as sass from "sass";

const TARGETS = browserslistToTargets(
  browserslist("last 2 versions and not dead")
);

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

export function scss({ files }: Options): Plugin {
  return {
    name: "scss",
    buildStart() {
      for (const file of files) {
        console.log(`🎨 Building ${file.entry}…`);

        const entry = path.resolve(file.entry);

        const { css, sourceMap: sassSourceMap } = sass.compile(entry, {
          sourceMap: true,
        });
        const { code, map: cssSourceMap } = transform({
          filename: entry,
          code: Buffer.from(css),
          targets: TARGETS,
          minify: true,
          sourceMap: true,
          inputSourceMap: sassSourceMap
            ? JSON.stringify(sassSourceMap)
            : undefined,
        });

        const destination = path.resolve(file.destination);

        createFile(destination, code);

        if (cssSourceMap) {
          createFile(`${destination}.map`, cssSourceMap);
        }
      }
    },
  };
}
