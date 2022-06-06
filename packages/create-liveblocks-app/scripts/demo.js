#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";

/**
 * Use `npm run demo` and check in .demo folder
 */

execSync("tsc");

const testDir = join(process.cwd(), "./.demo");

rmSync(testDir, { recursive: true, force: true });
mkdirSync(testDir);

execSync(`node ../dist/index.js nextjs-live-avatars`, {
  cwd: testDir,
  stdio: 'inherit',
});
