import { defineConfig } from "tsup";
import { lezer } from "./plugins/esbuild-plugin-lezer.js";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  esbuildPlugins: [lezer as any],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
