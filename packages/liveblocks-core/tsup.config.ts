import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
    // Replace `import.meta.env.VITE_LIVEBLOCKS_BASE_URL` with `undefined`
    // For cjs builds
    if (context.format === "cjs") {
      options.define["import.meta.env.VITE_LIVEBLOCKS_BASE_URL"] = "undefined";
    }
  },
});
