import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "typecheck",
    typecheck: {
      enabled: true,
      only: true,
      ignoreSourceErrors: true,
      include: ["test-d/**/*.test-d.ts"],
    },
  },
});
