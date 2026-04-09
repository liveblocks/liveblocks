import { makeTypecheckTestConfig } from "@liveblocks/vitest-config/typecheck";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: makeTypecheckTestConfig(
          import.meta,
          ["test-d/augmentation.test-d.ts"],
          "augmentation"
        ),
      },
      {
        test: makeTypecheckTestConfig(
          import.meta,
          ["test-d/no-augmentation.test-d.ts"],
          "no-augmentation"
        ),
      },
    ],
  },
});
