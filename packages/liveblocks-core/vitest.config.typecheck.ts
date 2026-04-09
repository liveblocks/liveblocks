import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "typecheck",
    typecheck: {
      enabled: true,
      only: true,
      ignoreSourceErrors: true,
      tsconfig: "./tsconfig.typecheck.json",
      include: ["test-d/**/*.test-d.ts"],
    },
  },
});
