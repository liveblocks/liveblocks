import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // coverage: {
    //   provider: "istanbul",
    //   reporter: ["text", "html"],
    //   exclude: ["bin/", "*.cjs", "test/", "test-d/"],
    //
    //   // Require 100% test coverage
    //   // lines: 100,
    //   // functions: 100,
    //   // statements: 100,
    //   // branches: 100,
    // },
  },
});
