import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/suspense.ts", "src/_private.ts"],
  dts: true,
  clean: true,
  format: ["esm", "cjs"],
  outExtensions: ({ format }) => ({
    js: format === "cjs" ? ".cjs" : ".js",
  }),
  sourcemap: true,
  target: false,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },
});
