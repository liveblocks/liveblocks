/**
 * This configuration is heavily inspired from https://github.com/pmndrs/zustand/blob/main/rollup.config.js
 */
import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import babelPlugin from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import esbuild from "rollup-plugin-esbuild";
import { promises } from "fs";
const createBabelConfig = require("./babel.config");

const extensions = [".ts"];

const external = ["@liveblocks/client"];

function getBabelOptions(targets) {
  return {
    ...createBabelConfig({ env: (env) => env === "build" }, targets),
    extensions,
    comments: false,
    babelHelpers: "bundled",
  };
}

function getEsbuild(target) {
  return esbuild({
    minify: false,
    target,
    tsconfig: path.resolve("./tsconfig.build.json"),
  });
}

/**
 * We use @rollup/plugin-typescript to generate typescript definition
 * but it does not support the declarationOnly option so we delete
 * js files and additional undesirable d.ts files
 */
function createDeclarationConfig(input, output) {
  return {
    input,
    output: {
      dir: output,
    },
    external,
    plugins: [
      typescript({
        declaration: true,
        outDir: output,
        tsconfig: "./tsconfig.build.json",
      }),
      {
        closeBundle: async () => {
          await Promise.all(
            [`./${output}/index.js`, `./${output}/errors.d.ts`].map(
              promises.unlink
            )
          );
        },
      },
    ],
  };
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: output, format: "cjs", exports: "named" },
    external,
    plugins: [
      resolve({ extensions }),
      babelPlugin(getBabelOptions({ ie: 11 })),
    ],
  };
}

function createESMConfig(input, output) {
  return {
    input,
    external,
    output: [
      { file: `${output}.js`, format: "esm" },
      { file: `${output}.mjs`, format: "esm" },
    ],
    plugins: [getEsbuild("node12")],
  };
}

export default [
  createDeclarationConfig("src/index.ts", "lib"),
  createCommonJSConfig("src/index.ts", "lib/index.js"),
  createESMConfig("src/index.ts", "lib/esm/index"),
];
