import replace from "@rollup/plugin-replace";
import fs from "fs/promises";
import MagicString from "magic-string";
import { createRequire } from "module";
import path from "path";
import postcss from "postcss";
import typescript from "@rollup/plugin-typescript";
import esbuild from "rollup-plugin-esbuild";

/**
 * @typedef {Object} Pkg
 * @property {string} version
 * @property {Record<string, string>} dependencies
 * @property {Record<string, string>} peerDependencies
 */

/**
 * @typedef {Object} File
 * @property {string} entry
 * @property {string} destination
 */

/**
 * @typedef {Object} CleanOptions
 * @property {string} directory
 */

/**
 * @typedef {Object} StylesOptions
 * @property {File[]} files
 */

/** @typedef {'cjs' | 'esm'} Format */

const require = createRequire(import.meta.url);

/**
 * @param {string} file
 * @param {string | NodeJS.ArrayBufferView} data
 */
async function createFile(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

/**
 * @param {string[]} dependencies
 * @returns {RegExp[]}
 */
function createExternals(dependencies) {
  return dependencies.map((dependency) => new RegExp(`^${dependency}(/.*)?$`));
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
 * @param {string} from
 * @param {string} to
 * @param {string} contrast
 * @param {string} increment
 * @returns {string}
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

/**
 * @typedef {Object} RollupConfigOptions
 * @property {Pkg} pkg
 * @property {string[]} entries
 * @property {File[]} styles
 * @property {RegExp[]} [external]
 */

/**
 * @param {RollupConfigOptions} options
 * @returns {import('rollup').RollupOptions[]}
 */
export function createConfig({ pkg, entries, styles: styleFiles, external }) {
  /**
   * @param {CleanOptions} options
   * @returns {import('rollup').Plugin}
   */
  function clean({ directory }) {
    return {
      name: "clean",
      buildStart: {
        order: "pre",
        async handler() {
          await fs.rm(path.resolve(directory), {
            recursive: true,
            force: true,
          });
        },
      },
    };
  }

  /**
   * @param {StylesOptions} options
   * @returns {import('rollup').Plugin}
   */
  function styles({ files }) {
    return {
      name: "styles",
      async buildStart() {
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
            await fs.readFile(entry, "utf8"),
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

  /**
   * @returns {import('rollup').Plugin}
   */
  function preserveUseClient() {
    return {
      name: "preserve-use-client",
      renderChunk: {
        order: "post",
        handler(code, chunk) {
          // Only do this for OutputChunks, not OutputAssets
          if ("modules" in chunk) {
            const magicString = new MagicString(code);

            // Find all "use client" directives
            const regex = /^(["'])use client\1;?/gm;
            const matches = Array.from(code.matchAll(regex));

            if (matches.length > 0) {
              // Remove all existing "use client" directives
              matches.forEach((match) => {
                magicString.remove(match.index, match.index + match[0].length);
              });

              // Add a single "use client" directive at the start of the file
              magicString.prepend('"use client";\n');

              return {
                code: magicString.toString(),
                map: magicString.generateMap(),
              };
            }
          }

          return null;
        },
      },
    };
  }

  /**
   * @param {string} directory
   * @returns {string[]}
   */
  async function getFiles(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    const files = await Promise.all(
      entries.map((entry) => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? getFiles(fullPath) : fullPath;
      })
    );

    return files.flat();
  }

  const dtsRegex = /\.d\.ts(\.map)?$/;
  const declarationMapFileRegex = /("file"\s*:\s*".*?\.d)\.ts/;
  const sourceMappingUrlRegex = /^(\/\/.*sourceMappingURL=.*\.d)\.ts\.map/gm;

  /**
   * @returns {import('rollup').Plugin}
   */
  function createDcts() {
    return {
      name: "create-d-cts",
      async writeBundle() {
        const files = await getFiles(path.resolve("dist"));
        const dtsFiles = files.filter(
          (file) => file.endsWith(".d.ts") || file.endsWith(".d.ts.map")
        );

        await Promise.all(
          dtsFiles.map(async (file) => {
            // Rename .d.ts and .d.ts.map files to .d.cts and .d.cts.map
            const renamedFile = file.replace(dtsRegex, ".d.cts$1");
            await fs.copyFile(file, renamedFile);

            // Update .d.cts files to point to their .d.cts.map file
            if (file.endsWith(".d.ts")) {
              const content = await fs.readFile(renamedFile, "utf-8");
              await fs.writeFile(
                renamedFile,
                content.replace(sourceMappingUrlRegex, "$1.cts.map"),
                "utf-8"
              );
            }

            // Update .d.cts.map files to point to their .d.cts file
            if (file.endsWith(".d.ts.map")) {
              const content = await fs.readFile(renamedFile, "utf-8");
              await fs.writeFile(
                renamedFile,
                content.replace(declarationMapFileRegex, "$1.cts"),
                "utf-8"
              );
            }
          })
        );
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
            dir: "dist",
            entryFileNames:
              pkg.type === "commonjs" ? "[name].js" : "[name].cjs",
            preserveModules: true,
            preserveModulesRoot: "src",
            format: "cjs",
            sourcemap: true,
          }
        : {
            dir: "dist",
            entryFileNames: pkg.type === "module" ? "[name].js" : "[name].mjs",
            preserveModules: true,
            preserveModulesRoot: "src",
            format: "esm",
            sourcemap: true,
          };

    return {
      input: entries,
      external: [
        ...createExternals([
          ...Object.keys(pkg.dependencies),
          ...Object.keys(pkg.peerDependencies),
        ]),
        // "react-dom" is an implicit peer dependency
        "react-dom",
        ...(external ?? []),
      ],
      output,
      treeshake: false,
      plugins: [
        esbuild({
          target: "es2022",
          sourceMap: true,
          jsx: "automatic",
        }),
        preserveUseClient(),
        replace({
          values: {
            __VERSION__: JSON.stringify(pkg.version),
            ROLLUP_FORMAT: JSON.stringify(format),
          },
          preventAssignment: true,
        }),
        // Clean dist directory (only run once)
        format === "cjs" && clean({ directory: "dist" }),
        // Build .css files (only run once)
        format === "cjs" &&
          styles({
            files: styleFiles,
          }),
        // Build .d.ts files (only run once)
        format === "cjs" &&
          typescript({
            outDir: "dist",
            declarationDir: "dist",
            emitDeclarationOnly: true,
            declaration: true,
            declarationMap: true,
            exclude: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
          }),
        // Duplicate .d.ts files (and their maps) as .d.cts (only run once)
        format === "cjs" && createDcts(),
      ].filter(Boolean),
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

  return [createMainConfig("cjs"), createMainConfig("esm")];
}
