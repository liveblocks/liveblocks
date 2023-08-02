import { defineConfig } from "tsup";
import { transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import fs from "fs";
import path from "path";
import * as sass from "sass";

const TARGETS = browserslistToTargets(
  browserslist("last 2 versions and not dead")
);

type StylesFile = {
  entry: string;
  destination: string;
};

function createFile(file: string, data: string | NodeJS.ArrayBufferView) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function buildStyles(files: StylesFile[]) {
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
      inputSourceMap: sassSourceMap ? JSON.stringify(sassSourceMap) : undefined,
    });

    const destination = path.resolve(file.destination);

    createFile(destination, code);

    if (cssSourceMap) {
      createFile(`${destination}.map`, cssSourceMap);
    }
  }
}

export default defineConfig({
  entry: ["src/index.ts", "src/primitives/index.ts"],
  external: ["react-dom"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2020",
  format: ["esm", "cjs"],
  sourcemap: true,
  async onSuccess() {
    buildStyles([
      {
        entry: "src/styles/default/index.scss",
        destination: "./default.css",
      },
      {
        entry: "src/styles/default/dark/media-query.scss",
        destination: "./default/dark/media-query.css",
      },
      {
        entry: "src/styles/default/dark/attributes.scss",
        destination: "./default/dark/attributes.css",
      },
    ]);
  },
  esbuildOptions(options) {
    options.banner = {
      js: '"use client"',
    };
  },
});
