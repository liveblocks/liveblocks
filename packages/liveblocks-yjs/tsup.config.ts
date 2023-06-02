import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2015",
  format: ["cjs"],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
