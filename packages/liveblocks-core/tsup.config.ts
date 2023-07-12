import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  target: "es2020",
  format: ["cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    // Replace PKG_VERSION global constant with a concrete version
    options.define.PKG_VERSION = JSON.stringify(
      require("./package.json").version
    );
  },
});
