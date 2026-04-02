import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["vitest.setup.ts"],
  },
});
