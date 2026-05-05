import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  splitting: true,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,
  target: false,
  deps: {
    neverBundle: ["chat"],
  },
});
