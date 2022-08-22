import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/internal.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es5",
  format: [
    "cjs",

    // NOTE: We'll generate ESM wrappers around the generated CJS output
    // "esm",
  ],

  esbuildOptions(options, context) {
    // Replace __PACKAGE_VERSION__ global constant with a concrete version
    options.define.__PACKAGE_VERSION__ = JSON.stringify(
      require("./package.json").version
    );
  },

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
