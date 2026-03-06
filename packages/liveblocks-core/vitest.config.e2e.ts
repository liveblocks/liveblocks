import path from "path";
import { fileURLToPath } from "url";
import type { ViteUserConfig } from "vitest/config";
import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSetup = path.resolve(__dirname, "../../shared/vitest-config/setup.js");

export default defaultLiveblocksVitestConfig({
  test: {
    // Only run e2e/* tests, not the "normal" tests in src/*
    include: ["e2e/**/*.test.*"],

    // Include the conditional WASM engine setup so that
    // LIVEBLOCKS_ENGINE=wasm actually activates the WASM engine.
    setupFiles: [sharedSetup, "src/__tests__/wasm-engine-setup.ts"],

    // Use node environment for e2e tests instead of jsdom
    environment: "node",
    testTimeout: 30000,
  },
} satisfies ViteUserConfig);
