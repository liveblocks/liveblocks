import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/internal.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es5",
  format: ["esm", "cjs"],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
