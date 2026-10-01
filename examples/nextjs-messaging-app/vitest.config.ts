import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    // Playwright owns tests/e2e
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/api/**/*.test.ts",
      "tests/components/**/*.test.tsx",
    ],
    // API route tests opt into node with a `// @vitest-environment node` header
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
