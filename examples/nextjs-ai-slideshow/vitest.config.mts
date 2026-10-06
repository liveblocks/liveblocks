import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Unit tests default to node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock.
    environment: "node",
    include: ["**/tests/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "scripts/**"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["app/**", "views/**", "features/**", "lib/**"],
      exclude: ["**/tests/**", "**/*.d.ts"],
    },
  },
});
