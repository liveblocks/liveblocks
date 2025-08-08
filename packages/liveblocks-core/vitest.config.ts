import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    globals: true,
    exclude: ["e2e/**"], // These are run via `npm run test:e2e`
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
