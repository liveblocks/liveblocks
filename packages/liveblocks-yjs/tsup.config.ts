import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2020",
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    const pkg = require("./package.json");
    // Replace PKG_NAME and PKG_VERSION globals with concrete version
    options.define.PKG_NAME = JSON.stringify(pkg.name);
    options.define.PKG_VERSION = JSON.stringify(pkg.version);
  },
});
