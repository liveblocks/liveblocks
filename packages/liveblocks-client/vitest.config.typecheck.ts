import { makeTypecheckTestConfig } from "@liveblocks/vitest-config/typecheck";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: makeTypecheckTestConfig(import.meta, [
          "test-d/room.test-d.ts",
          "test-d/client.no-augmentation.test-d.ts",
        ]),
      },
      {
        test: makeTypecheckTestConfig(
          import.meta,
          ["test-d/client.augmentation.test-d.ts"],
          "augmentation"
        ),
      },
      {
        test: makeTypecheckTestConfig(
          import.meta,
          ["test-d/client.augmentation-only-storage.test-d.ts"],
          "augmentation-only-storage"
        ),
      },
      {
        test: makeTypecheckTestConfig(
          import.meta,
          ["test-d/client.augmentation-only-presence.test-d.ts"],
          "augmentation-only-presence"
        ),
      },
    ],
  },
});
