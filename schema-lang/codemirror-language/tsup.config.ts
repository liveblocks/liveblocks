import { defineConfig } from "tsup";
import { lezer } from "./plugins/esbuild-plugin-lezer";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  esbuildPlugins: [
    // @ts-expect-error Should work but doesn't because we have multiple versions of esbuild in our dep tree that conflict
    lezer,
  ],

  // Perhaps enable later?
  // "minify": true,
  // "sourcemap": true,
});
