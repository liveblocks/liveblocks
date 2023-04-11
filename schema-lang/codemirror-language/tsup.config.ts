import { defineConfig } from "tsup";
import { lezer } from "./plugins/esbuild-plugin-lezer";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2015",
  format: ["esm"],
  esbuildPlugins: [lezer],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
