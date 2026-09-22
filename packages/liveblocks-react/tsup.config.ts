import { defineConfig } from "tsup";

const entry = {
  index: "src/index.ts",
  suspense: "src/suspense.ts",
  _private: "src/_private.ts",
};

export default defineConfig({
  entry: {
    ...entry,
    "react-dom": "src/lib/react-dom.ts",
    "react-dom.web": "src/lib/react-dom.ts",
    "react-dom.native": "src/lib/react-dom.native.ts",
  },
  dts: { entry },
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,

  // Preserve the helper boundary so Metro can select its platform variant.
  esbuildPlugins: [
    {
      name: "react-dom-platform",
      setup(build) {
        build.onResolve({ filter: /^\.\/react-dom$/ }, () => ({
          path: `./react-dom${build.initialOptions.outExtension?.[".js"] ?? ".js"}`,
          external: true,
        }));
      },
    },
  ],

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },
});
