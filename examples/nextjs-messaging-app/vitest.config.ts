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
    include: ["{features,views,primitives,lib}/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    css: false,
    clearMocks: true,
    restoreMocks: true,
  },
});
