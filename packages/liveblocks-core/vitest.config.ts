import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    // Don't run the e2e/* tests, only the "normal" tests in src/*
    // e2e/* tests will be run by `npm run test:e2e`
    exclude: ["e2e/**"],

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
