import { defineConfig } from "vitest/config";
import type { TypecheckConfig } from "vitest/node";

const typecheckConfig: Partial<TypecheckConfig> = {
  enabled: true,
  only: true,
  ignoreSourceErrors: true,
  tsconfig: "./tsconfig.typecheck.json",
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "typecheck",
          typecheck: {
            ...typecheckConfig,
            include: [
              "test-d/room.test-d.ts",
              "test-d/client.no-augmentation.test-d.ts",
            ],
          },
        },
      },
      {
        test: {
          name: "typecheck/augmentation",
          typecheck: {
            ...typecheckConfig,
            include: ["test-d/client.augmentation.test-d.ts"],
          },
        },
      },
      {
        test: {
          name: "typecheck/augmentation-only-storage",
          typecheck: {
            ...typecheckConfig,
            include: ["test-d/client.augmentation-only-storage.test-d.ts"],
          },
        },
      },
      {
        test: {
          name: "typecheck/augmentation-only-presence",
          typecheck: {
            ...typecheckConfig,
            include: ["test-d/client.augmentation-only-presence.test-d.ts"],
          },
        },
      },
    ],
  },
});
