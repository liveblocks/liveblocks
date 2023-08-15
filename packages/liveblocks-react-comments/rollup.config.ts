import { createRequire } from "module";
import type { RollupOptions } from "rollup";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import preserveDirectives from "rollup-plugin-preserve-directives";

import { clean } from "./plugins/rollup/clean";
import { scss } from "./plugins/rollup/scss";

const SRC_DIR = "src";
const DIST_DIR = "dist";
const ENTRIES = [`${SRC_DIR}/index.ts`, `${SRC_DIR}/primitives/index.ts`];

interface Pkg {
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
}

const pkg = createRequire(import.meta.url)("./package.json") as Pkg;

const configs: RollupOptions[] = [
  // Build .js and .mjs files
  {
    input: ENTRIES,
    external: [
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.peerDependencies),
      "react-dom",
    ],
    output: [
      {
        dir: DIST_DIR,
        preserveModules: true,
        preserveModulesRoot: SRC_DIR,
        format: "cjs",
        sourcemap: true,
      },
      {
        dir: DIST_DIR,
        entryFileNames: "[name].mjs",
        preserveModules: true,
        preserveModulesRoot: SRC_DIR,
        format: "esm",
        sourcemap: true,
      },
    ],
    treeshake: true,
    plugins: [
      clean({ directory: DIST_DIR }),
      esbuild({
        target: "es2020",
        sourceMap: true,
      }),
      preserveDirectives(),

      // Build .css files
      scss({
        files: [
          {
            entry: `${SRC_DIR}/styles/index.scss`,
            destination: "styles.css",
          },
          {
            entry: `${SRC_DIR}/styles/dark/media-query.scss`,
            destination: "styles/dark/media-query.css",
          },
          {
            entry: `${SRC_DIR}/styles/dark/attributes.scss`,
            destination: "styles/dark/attributes.css",
          },
        ],
      }),
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

  // Build .d.ts and .d.mts files
  ...ENTRIES.map((input) => ({
    input,
    output: [
      {
        file: input
          .replace(`${SRC_DIR}/`, `${DIST_DIR}/`)
          .replace(/\.ts$/, ".d.ts"),
      },
      {
        file: input
          .replace(`${SRC_DIR}/`, `${DIST_DIR}/`)
          .replace(/\.ts$/, ".d.mts"),
      },
    ],
    plugins: [dts()],
  })),
];

export default configs;
