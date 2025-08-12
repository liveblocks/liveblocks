import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["vitest.setup.ts"],
  },
});
