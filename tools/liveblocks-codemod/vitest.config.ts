import { defineConfig } from "vitest/config";

// `@liveblocks/codemod` cannot move to ESM so we can't use
// `defaultLiveblocksVitestConfig` from `@liveblocks/vitest-config`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html"],
    },
  },
});
