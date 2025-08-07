import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    // Enable test globals like describe, it, test, expect
    globals: true,
    // Use node environment for e2e tests instead of jsdom
    environment: "node",
    timeout: 30000,
    include: ["e2e/**/*.{test,spec}.{js,ts}"],
  },
});