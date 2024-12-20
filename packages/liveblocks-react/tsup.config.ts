import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/suspense.ts", "src/_private.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },
});
