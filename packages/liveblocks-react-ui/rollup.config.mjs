/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import replace from "@rollup/plugin-replace";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import postcss from "postcss";
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import preserveDirectives from "rollup-plugin-preserve-directives";

const SRC_DIR = "src";
const DIST_DIR = "dist";
const ENTRIES = [`${SRC_DIR}/index.ts`];

/**
 * @typedef {Object} Pkg
 * @property {string} version
 * @property {Record<string, string>} dependencies
 * @property {Record<string, string>} peerDependencies
 */

/**
 * @typedef {'cjs' | 'esm'} Format
 */

/**
 * @typedef {Object} File
 * @property {string} entry The entry file path
 * @property {string} destination The destination file path
 */

/**
 * @typedef {Object} CleanOptions
 * @property {string} directory The directory to clean
 */

/**
 * @typedef {Object} StylesOptions
 * @property {File[]} files Array of file configurations
 */

const require = createRequire(import.meta.url);

/** @type {Pkg} */
const pkg = require("./package.json");

/**
 * Creates a file with the given data, creating directories if needed
 * @param {string} file The file path
 * @param {string | NodeJS.ArrayBufferView} data The file content
 */
function createFile(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

/**
 * Match dependencies exactly or with any subpath
 * @param {string[]} dependencies
 * @returns {RegExp[]}
 */
function createExternals(dependencies) {
  return dependencies.map((dependency) => new RegExp(`^${dependency}(/.*)?$`));
}

let didClean = false;

/**
 * Creates a Rollup plugin that cleans the specified directory
 * @param {CleanOptions} options The plugin options
 * @returns {import('rollup').Plugin} A Rollup plugin
 */
export function clean({ directory }) {
  return {
    name: "clean",
    buildStart: {
      order: "pre",
      handler() {
        if (!didClean) {
          fs.rmSync(path.resolve(directory), { recursive: true, force: true });
        }

        didClean = true;
      },
    },
  };
}

/**
 * Generates a scale of [50,100...900] colors based on a contrast
 * variable, which indicates the lowest percentage of the scale.
 *
 *   ╔═════════╗                                  ╔═════════╗
 *   ║  from   ║                                  ║   to    ║
 *   ╚═════════╝                                  ╚═════════╝
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─●───┬───┬───┬───┬───┬───┬───┬───┬───●
 *       ┌───────┴─┴───┴───┤   │   │   │   │   │   │
 *       │ contrast = 15%  │   │   │   │   │   │   │
 *       └───────┬─┬───┬───┤   │   │   │   │   │   │
 *               ◇ ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇   ◇
 *             50 100 200 300 400 500 600 700 800 900
 *
 *     0% ●────────────────────────────────────────────● 100%
 *        ● ─ ─ ─ ─ ─ ─ ─ ─ ●──┬──┬──┬──┬──┬──┬──┬──┬──●
 *                 ┌──────┴─┴──┴──┴──┤  │  │  │  │  │
 *                 │ contrast = 40%  │  │  │  │  │  │
 *                 └──────┬─┬──┬──┬──┤  │  │  │  │  │
 *                        ◇ ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇  ◇
 *
 * @param {string} from - The starting color in the scale.
 * @param {string} to - The ending color in the scale.
 * @param {string} contrast - The lowest percentage of the scale.
 * @param {string} increment - The increment for the scale step (e.g., 50, 100, ... 900).
 * @returns {string} The generated CSS color-mix function for the specified scale step.
 */
function colorMixScale(from, to, contrast, increment) {
  const unit = `(100% - ${contrast}) / 9`;
  let percentage;

  if (Number(increment) === 50) {
    percentage = `calc(100% - ${contrast} + (${unit}) / 2)`;
  } else {
    const index = Math.floor(Number(increment) / 100) - 1;

    percentage = `calc(100% - ${
      index === 0
        ? contrast
        : `(${contrast} + ${index === 1 ? unit : `${index} * (${unit})`})`
    })`;
  }

  return `color-mix(in srgb, ${to}, ${from} ${percentage})`;
}

let didStyles = false;

/**
 * Creates a Rollup plugin that processes CSS files with PostCSS
 * @param {StylesOptions} options The plugin options
 * @returns {import('rollup').Plugin} A Rollup plugin
 */
export function styles({ files }) {
  return {
    name: "styles",
    buildStart: async () => {
      if (didStyles) {
        return;
      }

      const processor = postcss([
        require("stylelint"),
        require("postcss-import"),
        require("postcss-advanced-variables"),
        require("postcss-functions")({
          functions: {
            "color-mix-scale": colorMixScale,
          },
        }),
        require("postcss-nesting"),
        require("postcss-combine-duplicated-selectors"),
        require("postcss-sort-media-queries"),
        require("postcss-lightningcss")({ browsers: ">= 1%" }),
        require("postcss-reporter")({
          clearReportedMessages: true,
          plugins: ["stylelint"],
          noPlugin: true,
          throwError: true,
        }),
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

      didStyles = true;
    },
  };
}

/**
 * @param {Format} format
 * @returns {import('rollup').RollupOptions}
 */
function createMainConfig(format) {
  /** @type {import('rollup').OutputOptions} */
  const output =
    format === "cjs"
      ? {
          dir: DIST_DIR,
          preserveModules: true,
          preserveModulesRoot: SRC_DIR,
          format: "cjs",
          sourcemap: true,
        }
      : {
          dir: DIST_DIR,
          entryFileNames: "[name].mjs",
          preserveModules: true,
          preserveModulesRoot: SRC_DIR,
          format: "esm",
          sourcemap: true,
        };

  return {
    input: ENTRIES,
    external: [
      ...createExternals([
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.peerDependencies),
      ]),
      // "react-dom" is an implicit peer dependency
      "react-dom",
    ],
    output,
    treeshake: false,
    plugins: [
      esbuild({
        target: "es2020",
        sourceMap: true,
      }),
      preserveDirectives(),
      replace({
        values: {
          __VERSION__: JSON.stringify(pkg.version),
          ROLLUP_FORMAT: JSON.stringify(format),
        },
        preventAssignment: true,
      }),
      // Clean dist directory
      clean({ directory: DIST_DIR }),
      // Build .css files
      styles({
        files: [
          {
            entry: `${SRC_DIR}/styles/index.css`,
            destination: "styles.css",
          },
          {
            entry: `${SRC_DIR}/styles/dark/media-query.css`,
            destination: "styles/dark/media-query.css",
          },
          {
            entry: `${SRC_DIR}/styles/dark/attributes.css`,
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
  };
}

/**
 * @returns {import('rollup').RollupOptions[]}
 */
function createTypesConfigs() {
  return ENTRIES.map((input) => ({
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
  }));
}

/** @type {import('rollup').RollupOptions[]} */
const configs = [
  // Build .js and .mjs files
  createMainConfig("cjs"),
  createMainConfig("esm"),
  // Build .d.ts and .d.mts files
  ...createTypesConfigs(),
];

export default configs;
