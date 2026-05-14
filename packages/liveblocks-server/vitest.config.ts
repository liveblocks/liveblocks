import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },

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
