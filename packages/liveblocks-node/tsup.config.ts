import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  splitting: true,
  clean: true,
  target: "es2020",
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },

  /**
   * Only types should be imported from @liveblocks/core, because this package
   * is made to be used in Node.js, and @liveblocks/core has browser-specific code.
   *
   * The `dts.resolve` option allows tsup to resolve and inline types (which allows us
   * to mark it as a devDependency) while `noExternal` prevents it from bundling code by mistake.
   */
  dts: {
    resolve: ["@liveblocks/core"],
  },
  noExternal: ["@liveblocks/core"],
  external: ["node-fetch"],
});
