import { defineConfig } from "tsup";
import { lezer } from "./plugins/esbuild-plugin-lezer";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  esbuildPlugins: [lezer],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
