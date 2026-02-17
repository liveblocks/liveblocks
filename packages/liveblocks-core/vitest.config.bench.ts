import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["benchmarks/**/*.bench.ts"],
    environment: "node",
    benchmark: {
      include: ["benchmarks/**/*.bench.ts"],
    },
  },
});
