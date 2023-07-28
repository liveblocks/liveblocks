import { defineConfig } from "tsup";
import { transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import fs from "fs";
import path from "path";
import * as sass from "sass";

const TARGETS = browserslistToTargets(
  browserslist("last 2 versions and not dead")
);

type File = {
  name: string;
  path: string;
};

function buildStyles(files: File[]) {
  for (const file of files) {
    console.log(`🎨 Building ${file.name}…`);
    const { css, sourceMap } = sass.compile(file.path, { sourceMap: true });

    console.log(`🎨 Minifying ${file.name}…`);
    const { code, map } = transform({
      filename: file.name,
      code: Buffer.from(css),
      targets: TARGETS,
      minify: true,
      sourceMap: true,
      inputSourceMap: sourceMap ? JSON.stringify(sourceMap) : undefined,
    });

    fs.writeFileSync(`./${file.name}`, code);

    if (map) {
      fs.writeFileSync(`./${file.name}.map`, map);
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
        name: "default.css",
        path: "src/styles/default.scss",
      },
    ]);
  },
});
