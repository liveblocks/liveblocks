import { defineConfig } from "vitest/config";
import type { TypecheckConfig } from "vitest/node";

const typecheckConfig: Partial<TypecheckConfig> = {
  enabled: true,
  only: true,
  ignoreSourceErrors: true,
};

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "test-d/default",
          typecheck: {
            ...typecheckConfig,
            tsconfig: "./tsconfig.typecheck.json",
            include: [
              "test-d/room.test-d.ts",
              "test-d/client.no-augmentation.test-d.ts",
            ],
          },
        },
      },
      {
        test: {
          name: "test-d/augmentation",
          typecheck: {
            ...typecheckConfig,
            tsconfig: "./tsconfig.typecheck.augmentation.json",
            include: ["test-d/client.augmentation.test-d.ts"],
          },
        },
      },
      {
        test: {
          name: "test-d/augmentation-only-storage",
          typecheck: {
            ...typecheckConfig,
            tsconfig: "./tsconfig.typecheck.augmentation-only-storage.json",
            include: ["test-d/client.augmentation-only-storage.test-d.ts"],
          },
        },
      },
      {
        test: {
          name: "test-d/augmentation-only-presence",
          typecheck: {
            ...typecheckConfig,
            tsconfig: "./tsconfig.typecheck.augmentation-only-presence.json",
            include: ["test-d/client.augmentation-only-presence.test-d.ts"],
          },
        },
      },
    ],
  },
});
