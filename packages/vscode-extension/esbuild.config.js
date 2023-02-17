const { context, build } = require("esbuild");
const { copy } = require("esbuild-plugin-copy");
const { parseArgs } = require("node:util");

const {
  values: { minify, sourcemap, watch },
} = parseArgs({
  options: {
    minify: { type: "boolean", default: false },
    watch: { type: "boolean", default: false },
    sourcemap: { type: "boolean", default: false },
  },
});

const run = async () => {
  const config = {
    minify,
    sourcemap,
    logLevel: "info",
    entryPoints: ["./src/extension.ts"],
    outfile: "./dist/main.js",
    external: ["vscode"],
    bundle: true,
    format: "cjs",
    platform: "node",
    plugins: [
      // Copy the grammar file into the dist folder so we can reference it in the package.json
      copy({
        resolveFrom: "cwd",
        assets: {
          from: require.resolve("@liveblocks/textmate-grammar"),
          to: "dist/grammars",
        },
      }),
    ],
  };

  if (watch) {
    const buildCtx = await context(config);
    return buildCtx.watch();
  }

  build(config);
};

run();
