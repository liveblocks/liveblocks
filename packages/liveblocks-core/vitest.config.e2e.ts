import type { ViteUserConfig } from "vitest/config";
import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    // Only run e2e/* tests, not the "normal" tests in src/*
    include: ["e2e/**/*.test.*"],

    // Use node environment for e2e tests instead of happy-dom
    environment: "node",
    testTimeout: 30000,
  },
} satisfies ViteUserConfig);
