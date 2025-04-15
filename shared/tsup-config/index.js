import { defineConfig } from "tsup";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

/**
 * @param {string} directory
 * @returns {string[]}
 */
async function getFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? getFiles(fullPath) : fullPath;
    })
  );

  return files.flat();
}

const dtsRegex = /\.d\.ts(\.map)?$/;
const declarationMapFileRegex = /("file"\s*:\s*".*?\.d)\.ts/;
const sourceMappingUrlRegex = /^(\/\/.*sourceMappingURL=.*\.d)\.ts\.map/gm;

// tsup's `dts` option doesn't support declaration maps so we use tsc ourselves.
// https://tsup.egoist.dev/#generate-typescript-declaration-maps--d-ts-map
async function generateDts() {
  console.log("DTS Build start");

  // Generate .d.ts files
  execSync("tsc --project tsconfig.tsup.json", {
    stdio: "inherit",
  });

  const files = await getFiles(path.resolve("dist"));
  const dtsFiles = files.filter(
    (file) => file.endsWith(".d.ts") || file.endsWith(".d.ts.map")
  );

  await Promise.all(
    dtsFiles.map(async (file) => {
      // Rename .d.ts and .d.ts.map files to .d.cts and .d.cts.map
      const renamedFile = file.replace(dtsRegex, ".d.cts$1");
      await fs.copyFile(file, renamedFile);

      // Update .d.cts files to point to their .d.cts.map file
      if (file.endsWith(".d.ts")) {
        const content = await fs.readFile(renamedFile, "utf-8");
        await fs.writeFile(
          renamedFile,
          content.replace(sourceMappingUrlRegex, "$1.cts.map"),
          "utf-8"
        );
      }

      // Update .d.cts.map files to point to their .d.cts file
      if (file.endsWith(".d.ts.map")) {
        const content = await fs.readFile(renamedFile, "utf-8");
        await fs.writeFile(
          renamedFile,
          content.replace(declarationMapFileRegex, "$1.cts"),
          "utf-8"
        );
      }
    })
  );

  console.log("DTS ⚡️ Build success");
}

/**
 * @param {string[]} entry
 * @returns {import('tsup').Options}
 */
export function createConfig(entry) {
  return defineConfig({
    entry,
    dts: !process.env.DECLARATION_MAPS,
    splitting: true,
    clean: true,
    format: ["esm", "cjs"],
    sourcemap: true,
    onSuccess: process.env.DECLARATION_MAPS ? generateDts : undefined,

    esbuildOptions(options, _context) {
      // Replace __VERSION__ globals with concrete version
      const pkg = require("./package.json");
      options.define.__VERSION__ = JSON.stringify(pkg.version);
    },
  });
}
