#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";

const testDir = join(process.cwd(), "./.demo");

rmSync(testDir, { recursive: true, force: true });
mkdirSync(testDir);

execSync(`node ../dist/index.js`, {
  cwd: testDir,
  stdio: 'inherit',
});
