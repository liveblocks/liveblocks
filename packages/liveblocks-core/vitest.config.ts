import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://dummy/"
      }
    },
    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      exclude: ["**/__tests__/**"],
    },
  },
});