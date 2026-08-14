import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keep one core module identity when tests import source-only test helpers.
const liveblocksCore = path.resolve(
  __dirname,
  "../../packages/liveblocks-core/src/index.ts"
);

export function defaultLiveblocksVitestConfig(options = {}) {
  return defineConfig({
    resolve: {
      tsconfigPaths: true,
      alias: {
        "@liveblocks/core": liveblocksCore,
      },
      dedupe: ["@liveblocks/core"],
    },
    test: {
      include: ["src/**/*.test.[jt]s?(x)", "test/**/*.test.[jt]s?(x)"],
      setupFiles: [path.join(__dirname, "setup.js")],

      coverage: {
        provider: "istanbul",
        reporter: ["text", "html"],
        include: ["src/"],

        // Require 100% test coverage
        thresholds: {
          // lines: 100,
          // functions: 100,
          // statements: 100,
          // branches: 100,
        },
      },
      ...options.test,
    },
  });
}
