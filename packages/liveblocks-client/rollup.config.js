/**
 * This configuration is heavily inspired from https://github.com/pmndrs/zustand/blob/main/rollup.config.js
 */
import babelPlugin from "@rollup/plugin-babel";
import commandPlugin from "rollup-plugin-command";
import dts from "rollup-plugin-dts";
import replaceText from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import typescriptPlugin from "@rollup/plugin-typescript";
import { promises } from "fs";
const createBabelConfig = require("./babel.config");

function execute(cmd, wait = true) {
  return commandPlugin(cmd, { exitOnFail: true, wait });
}

/**
 * TypeScript plugin configured to only produce *.js code files, no *.d.ts
 * files.
 */
function typescriptCompile() {
  return typescriptPlugin({
    declaration: false,
    tsconfig: "./tsconfig.build.json",
    noEmitOnError: true, // Let rollup build fail if there are TypeScript errors
  });
}

/**
 * TypeScript plugin configured to only produce *.d.ts files, no code
 * compilation.
 */
function typescriptDeclarations(outDir) {
  return typescriptPlugin({
    declaration: true,
    outDir,
    tsconfig: "./tsconfig.build.json",
    noEmitOnError: true, // Let rollup build fail if there are TypeScript errors
  });
}

function getBabelOptions(extensions, targets) {
  return {
    ...createBabelConfig({ env: (env) => env === "build" }, targets),
    extensions,
    comments: false,
    babelHelpers: "bundled",
  };
}

function buildESM(external = []) {
  return {
    input: ["src/index.ts", "src/internal.ts"],
    output: {
      dir: "lib",
      format: "esm",
      entryFileNames: "[name].mjs",
      chunkFileNames: "shared.mjs",
    },
    external,
    plugins: [typescriptCompile()],
  };
}

function buildCJS(external = []) {
  const extensions = [".ts"];
  return {
    input: ["src/index.ts", "src/internal.ts"],
    output: {
      dir: "lib",
      format: "cjs",
      exports: "named",
      chunkFileNames: "shared.js",
    },
    external,
    plugins: [
      resolve({ extensions }),
      babelPlugin(getBabelOptions(extensions, { ie: 11 })),
    ],
  };
}

function buildDTS(external = []) {
  const tmpDir = "lib/tmp";
  const outDir = "lib";

  // Take the TypeScript source code in src/*.ts, and generate lib/types/*.d.ts
  // files for each.
  const step1 = {
    input: ["src/index.ts", "src/internal.ts"],
    output: {
      dir: tmpDir,
    },
    external,
    plugins: [
      // TypeScript plugin always emits compiled source and type
      // declarations...
      typescriptDeclarations(tmpDir),

      // ...but we're only interested in keeping the type declarations in this
      // step, so let's remove all files that aren't *.d.ts files
      execute(`find ${tmpDir} -type f '!' -iname '*.d.ts' -delete`),
    ],
  };

  const step2 = {
    input: ["index.d.ts", "internal.d.ts"].map((f) => `${tmpDir}/${f}`),
    output: [
      {
        dir: outDir,
        entryFileNames: "[name].d.ts",
        chunkFileNames: "shared.d.ts",
      },
    ],
    external,
    plugins: [
      dts(),

      // We no longer need this tmp dir from step 1 here, so clean it up ASAP
      // to avoid confusion
      execute(`rm -rf ${tmpDir}`),

      //
      // NOTE:
      // Okay, this is weird, and needs some explanation.
      //
      // There's probably some configuration setting for this behavior in the
      // dts() plugin (or elsewhere) somewhere, but I couldn't find it.
      //
      // When using `dts()` to roll up all the type definitions into a compact
      // bundle, it emits its files in this weird tree:
      //
      //     lib/types/
      //     ├── lib
      //     │   └── tmp
      //     │       ├── index.d.ts
      //     │       └── internal.d.ts
      //     └── shared-b97faa87.d.ts
      //
      // Inside `index.d.ts`, there's a re-export like:
      //
      //     export ... from "../../shared-b97faa87";
      //     //               ^^^^^^
      //
      // Baffles me why.
      //

      // Try to "fix" the above by moving the two files manually, and manually
      // fixing the import/export statements.

      replaceText({
        // Forgive me, lord 🙈
        "../../shared": "./shared",

        delimiters: ["", ""],
        preventAssignment: true,
      }),

      execute(
        `mv -v "${outDir}/${tmpDir}/"*.d.ts "${outDir}" && rm -rf "${outDir}/lib"`
      ),
    ],
  };

  return [step1, step2];
}

export default async () => {
  await promises.rm(`./lib`, {
    recursive: true,
    force: true,
  });

  const external = [];
  return [
    // Build modern ES modules (*.mjs)
    buildESM(external),

    // Build Common JS modules (*.js)
    buildCJS(external),

    // Build TypeScript declaration files (*.d.ts)
    buildDTS(external),
  ].flat();
};
