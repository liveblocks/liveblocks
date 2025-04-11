import { execSync } from "child_process";
import { defineConfig } from "tsup";

const isProductionBuild = process.env.NODE_ENV === "production";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: isProductionBuild,
  splitting: isProductionBuild,
  clean: true,
  format: ["esm", "cjs"],
  sourcemap: true,

  esbuildOptions(options, _context) {
    // Replace __VERSION__ globals with concrete version
    const pkg = require("./package.json");
    options.define.__VERSION__ = JSON.stringify(pkg.version);
  },

  onSuccess: isProductionBuild
    ? undefined
    : async () => {
        console.log("TSC Build start");
        execSync("tsc --project tsconfig.dts.json", {
          stdio: "inherit",
        });
        console.log("TSC ⚡️ Build success");
      },
});
