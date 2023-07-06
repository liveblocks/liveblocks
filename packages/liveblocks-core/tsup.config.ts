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
    // Replace __PACKAGE_VERSION__ global constant with a concrete version
    options.define.__PACKAGE_VERSION__ = JSON.stringify(
      require("./package.json").version
    );
  },
});
