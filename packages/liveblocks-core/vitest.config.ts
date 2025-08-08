import { configDefaults } from "vitest/config";
import { defaultLiveblocksVitestConfig } from "@liveblocks/vitest-config";

export default defaultLiveblocksVitestConfig({
  test: {
    globals: true,
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://dummy/",
      },
    },

    // Gotcha! One key difference between Jest (our old test runner) and Vitest
    // is that Vitest does not automatically mock the `performance.now()` method.
    // See https://github.com/vitest-dev/vitest/issues/4004
    fakeTimers: {
      toFake: [...configDefaults.fakeTimers.toFake, "performance"],
    },

    // Collect code coverage for this project, when using the --coverage flag
    coverage: {
      provider: "istanbul",
      exclude: ["**/__tests__/**"],
    },
  },
});
