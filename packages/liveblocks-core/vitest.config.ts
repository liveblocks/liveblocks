import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSetup = path.resolve(__dirname, "../../shared/vitest-config/setup.js");

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  test: {
    // Don't run the e2e/* tests, only the "normal" tests in src/*
    // e2e/* tests will be run by `npm run test:e2e`
    exclude: ["e2e/**"],

    // Include both the shared setup and the conditional WASM engine setup.
    // wasm-engine-setup.ts is a no-op unless LIVEBLOCKS_ENGINE=wasm.
    setupFiles: [sharedSetup, "src/__tests__/wasm-engine-setup.ts"],

    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://dummy/",
      },
    },
    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html"],
      include: ["src/"],
      exclude: ["**/__tests__/**"],
    },
  },
});
