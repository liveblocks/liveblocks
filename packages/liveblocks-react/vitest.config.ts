import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    setupFiles: ["vitest.setup.ts"],
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://dummy/",
      },
    },

    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      provider: "istanbul",
      exclude: ["**/__tests__/**"],
    },
  },
});
