import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: false,
  clean: true,
  bundle: true,
  platform: "browser",
  format: ["cjs", "esm"],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
