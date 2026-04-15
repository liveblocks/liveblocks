import { makeTypecheckTestConfig } from "@liveblocks/vitest-config/typecheck";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: makeTypecheckTestConfig(import.meta, ["test-d/**/*.test-d.ts"]),
});
