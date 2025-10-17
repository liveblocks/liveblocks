import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    environment: "jsdom",
    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      provider: "istanbul",
      include: ["src/**"],
      exclude: ["**/__tests__/**"],
    },
  },
});
