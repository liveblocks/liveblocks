/**
 * This configuration is heavily inspired from https://github.com/pmndrs/zustand/blob/main/rollup.config.js
 */
import path from "path";
import resolve from "@rollup/plugin-node-resolve";
import babelPlugin from "@rollup/plugin-babel";
import typescript from "@rollup/plugin-typescript";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import { promises } from "fs";
const createBabelConfig = require("./babel.config");

const extensions = [".tsx"];

const external = ["react", "@liveblocks/client"];

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
 * js files and bundle d.ts files with rollup-plugin-dts
 */
function createDeclarationConfig(input, output) {
  return [
    {
      input,
      output: {
        dir: "lib",
      },
      external,
      plugins: [
        typescript({
          declaration: true,
          outDir: `./lib/tmp`, // We need to put it in "lib" because of typescript can't @rollup/plugin-typescript ouput outside tsconfig outDir option
          tsconfig: "./tsconfig.build.json",
        }),
      ],
    },
    {
      input: `./lib/tmp/${output}.d.ts`,
      output: [{ file: `lib/${output}.d.ts`, format: "es" }],
      plugins: [
        dts(),
        {
          closeBundle: async () => {
            await promises.rm(`./lib/tmp`, {
              recursive: true,
              force: true,
            });
          },
        },
      ],
    },
  ];
}

function createCommonJSConfig(input, output) {
  return {
    input,
    output: { file: `lib/${output}`, format: "cjs", exports: "named" },
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
      { file: `lib/${output}.js`, format: "esm" },
      { file: `lib/${output}.mjs`, format: "esm" },
    ],
    plugins: [getEsbuild("node12")],
  };
}

export default async () => {
  await promises.rm(`./lib`, {
    recursive: true,
    force: true,
  });

  return [
    ...createDeclarationConfig("src/index.tsx", "index"),
    createCommonJSConfig("src/index.tsx", "index.js"),
    createESMConfig("src/index.tsx", "esm/index"),
  ];
};
