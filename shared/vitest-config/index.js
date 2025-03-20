import { defineConfig } from "vitest/config";

import tsconfigPaths from "vite-tsconfig-paths";

export function defaultLiveblocksVitestConfig(_options) {
  return defineConfig({
    plugins: [tsconfigPaths()],
    test: {
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
    },
  });
}
