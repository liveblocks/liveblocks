import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    // Only run e2e/* tests, not the "normal" tests in src/*
    include: ["e2e/**/*.test.*"],

    // Enable test globals like describe, it, test, expect
    globals: true,
    // Use node environment for e2e tests instead of jsdom
    environment: "node",
    timeout: 30000,
  },
});
