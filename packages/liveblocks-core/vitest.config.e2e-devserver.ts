import path from "path";
import { fileURLToPath } from "url";
import type { ViteUserConfig } from "vitest/config";
import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSetup = path.resolve(__dirname, "../../shared/vitest-config/setup.js");

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

    // Include the conditional WASM engine setup so that
    // LIVEBLOCKS_ENGINE=wasm actually activates the WASM engine.
    setupFiles: [sharedSetup, "src/__tests__/wasm-engine-setup.ts"],

    // Set dev server environment variables.
    // These can be overridden by the caller's environment.
    env: {
      LIVEBLOCKS_PUBLIC_KEY: "pk_localdev",
      NEXT_PUBLIC_LIVEBLOCKS_BASE_URL: "http://localhost:1153",
    },
  },
} satisfies ViteUserConfig);
