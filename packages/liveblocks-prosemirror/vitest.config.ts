import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vitestSetup = path.resolve(
  __dirname,
  "../../shared/vitest-config/setup.js"
);

// Force one copy of the Liveblocks internals so Symbols and CRDT classes match
// the source-level mock server used by the history integration tests.
const liveblocksCore = path.resolve(
  __dirname,
  "../liveblocks-core/src/index.ts"
);
const liveblocksClient = path.resolve(
  __dirname,
  "../liveblocks-client/src/index.ts"
);

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@liveblocks/core": liveblocksCore,
      "@liveblocks/client": liveblocksClient,
    },
    dedupe: ["@liveblocks/core", "@liveblocks/client"],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.[jt]s?(x)"],
    setupFiles: [vitestSetup],
  },
});
