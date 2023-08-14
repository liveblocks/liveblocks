import path from "path";
import fs from "fs";
import { createRequire } from "module";
import * as sass from "sass";
import { transform, browserslistToTargets } from "lightningcss";
import browserslist from "browserslist";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import preserveDirectives from "rollup-plugin-preserve-directives";

const pkg = createRequire(import.meta.url)("./package.json");

const INPUT_DIR = "src";
const OUTPUT_DIR = "dist";
const INPUTS = [`${INPUT_DIR}/index.ts`, `${INPUT_DIR}/primitives/index.ts`];
const TARGETS = browserslistToTargets(
  browserslist("last 2 versions and not dead")
);

function createFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function buildStylesheet(entry, destination) {
  console.log(`🎨 Building ${entry}…`);

  const resolvedEntry = path.resolve(entry);

  const { css, sourceMap: sassSourceMap } = sass.compile(resolvedEntry, {
    sourceMap: true,
  });
  const { code, map: cssSourceMap } = transform({
    filename: resolvedEntry,
    code: Buffer.from(css),
    targets: TARGETS,
    minify: true,
    sourceMap: true,
    inputSourceMap: sassSourceMap ? JSON.stringify(sassSourceMap) : undefined,
  });

  const resolvedDestination = path.resolve(destination);

  createFile(resolvedDestination, code);

  if (cssSourceMap) {
    createFile(`${resolvedDestination}.map`, cssSourceMap);
  }
}

export default [
  {
    input: INPUTS,
    external: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
      "react-dom",
    ],
    output: [
      {
        dir: OUTPUT_DIR,
        preserveModules: true,
        preserveModulesRoot: INPUT_DIR,
        format: "cjs",
        sourcemap: true,
      },
      {
        dir: OUTPUT_DIR,
        entryFileNames: "[name].mjs",
        preserveModules: true,
        preserveModulesRoot: INPUT_DIR,
        format: "esm",
        sourcemap: true,
      },
    ],
    treeshake: true,
    plugins: [
      {
        name: "clean-dist",
        buildStart() {
          fs.rmSync(path.resolve(OUTPUT_DIR), { recursive: true, force: true });
        },
      },
      {
        name: "build-styles",
        buildStart() {
          buildStylesheet(`${INPUT_DIR}/styles/index.scss`, "styles.css");
          buildStylesheet(
            `${INPUT_DIR}/styles/dark/media-query.scss`,
            "styles/dark/media-query.css"
          );
          buildStylesheet(
            `${INPUT_DIR}/styles/dark/attributes.scss`,
            "styles/dark/attributes.css"
          );
        },
      },
      esbuild({
        target: "es2020",
        sourceMap: true,
      }),
      preserveDirectives(),
    ],
    onwarn(warning, warn) {
      if (
        warning.code === "MODULE_LEVEL_DIRECTIVE" &&
        warning.message.includes("use client")
      ) {
        return;
      }
      warn(warning);
    },
  },
  ...INPUTS.map((input) => ({
    input,
    output: [
      {
        file: input
          .replace(`${INPUT_DIR}/`, `${OUTPUT_DIR}/`)
          .replace(/\.ts$/, ".d.ts"),
      },
      {
        file: input
          .replace(`${INPUT_DIR}/`, `${OUTPUT_DIR}/`)
          .replace(/\.ts$/, ".d.mts"),
      },
    ],
    plugins: [dts()],
  })),
];
