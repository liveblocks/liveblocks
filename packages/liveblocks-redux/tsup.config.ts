import { execSync } from "child_process";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: false,
  splitting: false,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },

  async onSuccess() {
    console.log("DTS Build start");
    execSync("tsc --project tsconfig.dts.json", {
      stdio: "inherit",
    });
    console.log("DTS ⚡️ Build success");
  },
});
