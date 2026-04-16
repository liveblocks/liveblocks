import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    // e2e/* tests will be run by `npm run test:e2e`
    environment: "happy-dom",

    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      provider: "istanbul",
      exclude: ["**/__tests__/**"],
      reporter: [["text", { maxCols: 100 }]],
    },
  },
});
