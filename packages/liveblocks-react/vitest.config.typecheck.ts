import { makeTypecheckTestConfig } from "@liveblocks/vitest-config/typecheck";
import { defineConfig } from "vitest/config";

// Multiple configs are used when testing augmentation and global
// declerations, to avoid leaking globals between tests.
export default defineConfig({
  test: {
    projects: [
      {
        test: makeTypecheckTestConfig(
          ["test-d/factories.test-d.tsx"],
          "factories"
        ),
      },
      {
        test: makeTypecheckTestConfig(
          ["test-d/augmentation.test-d.tsx"],
          "augmentation"
        ),
      },
      {
        test: makeTypecheckTestConfig(
          ["test-d/no-augmentation.test-d.tsx"],
          "no-augmentation"
        ),
      },
    ],
  },
});
