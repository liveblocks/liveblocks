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

    // Replaces:
    // - `__IMPORT_META__.env.FOO` → `import.meta.env.FOO`  (in ESM output)
    // - `__IMPORT_META__.env.FOO` → `null.meta.env.FOO`    (in CJS output)
    //
    // We need to do this, because `import.meta` is a *syntax error* in CJS files.
    if (context.format !== "cjs") {
      options.define["__IMPORT_META__"] = "import.meta";
    } else {
      options.define["__IMPORT_META__"] = "null";
    }
  },
});
