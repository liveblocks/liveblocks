#!/usr/bin/env node
import { execSync } from "child_process";
import { esbuildOptions } from "./esbuild.js";
import fs from "fs";
import path from "path";

const flags = "";

/**
 * Use `npm run demo` and check in .demo folder
 */

execSync("npm run build");

const testDir = path.join(process.cwd(), "./.demo");

fs.rmSync(testDir, { recursive: true, force: true });
fs.mkdirSync(testDir);

execSync(`node ${esbuildOptions.outfile} ${flags}`, {
  cwd: testDir,
  stdio: "inherit",
});
