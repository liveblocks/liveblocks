import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html"],
      include: ["src/"],

      // Coverage percentages
      // <90% of coverage is considered sub-optimal
      // >98% coverage is considered healthy
      watermarks: {
        branches: [90, 98],
        functions: [90, 98],
        lines: [90, 98],
        statements: [90, 98],
      },
    },
  },
});
