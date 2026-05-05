import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  target: false,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },
});
