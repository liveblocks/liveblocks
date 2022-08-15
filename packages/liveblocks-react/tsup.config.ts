import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2015",
  format: ["esm", "cjs"],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
