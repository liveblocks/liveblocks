import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],

  test: {
    // Will avoid having to put import `describe`, `test`, `expect`, etc in
    // every test file.
    globals: true,

    coverage: {
      enabled: true,
      reporter: [["text", { maxCols: 120 }], "html"],
      include: ["src/**/*.ts"],
    },
  },
});
