import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2015",
  format: [
    "cjs",

    // NOTE: We'll generate ESM wrappers around the generated CJS output
    // "esm",
  ],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
