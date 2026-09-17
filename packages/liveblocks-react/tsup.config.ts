import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/suspense.ts", "src/_private.ts"],
    dts: true,
    splitting: true,
    // The helpers build in parallel and must survive rebuilds in watch mode.
    clean: [
      "!react-dom.cjs",
      "!react-dom.cjs.map",
      "!react-dom.node.js",
      "!react-dom.node.js.map",
    ],
    format: ["esm", "cjs"],
    sourcemap: true,

    // Node ESM bundles need a loader that can fall back to createRequire().
    esbuildPlugins: [
      {
        name: "optional-react-dom",
        setup(build) {
          // Splitting builds both formats as ESM; use the output extension.
          build.onResolve({ filter: /^\.\/react-dom$/ }, () => ({
            path:
              build.initialOptions.outExtension?.[".js"] === ".cjs"
                ? "./react-dom.cjs"
                : "./react-dom.node.js",
            external: true,
          }));
        },
      },
    ],

    esbuildOptions(options, _context) {
      // Replace __VERSION__ globals with concrete version
      const pkg = require("./package.json");
      options.define.__VERSION__ = JSON.stringify(pkg.version);
    },
  },
  {
    entry: { "react-dom": "src/lib/react-dom.ts" },
    format: ["cjs"],
    // Splitting compiles through ESM and hides require() from downstream bundlers.
    splitting: false,
    sourcemap: true,
  },
  {
    entry: { "react-dom.node": "src/lib/react-dom.node.ts" },
    format: ["esm"],
    splitting: false,
    sourcemap: true,
    esbuildPlugins: [
      {
        name: "commonjs-react-dom",
        setup(build) {
          build.onResolve({ filter: /^\.\/react-dom$/ }, () => ({
            path: "./react-dom.cjs",
            external: true,
          }));
        },
      },
    ],
  },
]);
