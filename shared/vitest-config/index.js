import { configDefaults, defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function defaultLiveblocksVitestConfig(options = {}) {
  return defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      setupFiles: [path.join(__dirname, "setup.js")],

      // Gotcha! One key difference between Jest (our old test runner) and Vitest
      // is that Vitest does not automatically mock the `performance.now()` method.
      // Some of our tests rely on this behavior though.
      // See https://github.com/vitest-dev/vitest/issues/4004
      fakeTimers: {
        toFake: [...configDefaults.fakeTimers.toFake, "performance"],
      },

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
