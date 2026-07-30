import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vitestSetup = path.resolve(
  __dirname,
  "../../shared/vitest-config/setup.js"
);

// The mock WebSocket server lives in @liveblocks/core's src/__tests__/, which
// is neither exported nor built, so tests can only reach it by relative path.
// That loads core from source, while the code under test imports the built
// @liveblocks/core. Two copies means two kInternal Symbols and two sets of CRDT
// classes, so alias both onto the source copy.
const liveblocksCore = path.resolve(
  __dirname,
  "../../packages/liveblocks-core/src/index.ts"
);
const liveblocksClient = path.resolve(
  __dirname,
  "../../packages/liveblocks-client/src/index.ts"
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
    include: ["app/**/*.test.ts"],
    setupFiles: [vitestSetup],
  },
});
