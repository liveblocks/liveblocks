import type { ViteUserConfig } from "vitest/config";
import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

/**
 * E2E test config for running against the local Liveblocks dev server.
 *
 * Start the dev server before running:
 *   bunx liveblocks dev --port 1153
 *
 * Then run tests:
 *   npm run test:e2e:devserver
 *
 * Or with WASM engine:
 *   LIVEBLOCKS_ENGINE=wasm npm run test:e2e:devserver
 */
export default defaultLiveblocksVitestConfig({
  test: {
    include: ["e2e/**/*.test.*"],
    environment: "node",
    testTimeout: 60000,

    // Set dev server environment variables.
    // These can be overridden by the caller's environment.
    env: {
      LIVEBLOCKS_PUBLIC_KEY: "pk_localdev",
      NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: "http://localhost:1153",
    },
  },
} satisfies ViteUserConfig);
