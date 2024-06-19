#!/usr/bin/env node
import { execSync } from "child_process";
import { esbuildOptions } from "./esbuild.js";
import fs from "fs";
import path from "path";

const pkgJson = `{
  "name": "@liveblocks-examples/nextjs-comments",
  "description": "This example shows how to build comments with Liveblocks and Next.js.",
  "license": "Apache-2.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@liveblocks/client": "^1.11.0",
    "@liveblocks/node": "^1.11.0",
    "@liveblocks/react": "^1.11.0",
    "next": "^13.4.16",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-error-boundary": "^4.0.11"
  },
  "devDependencies": {
    "@types/node": "^20.4.2",
    "@types/react": "^18.3.3",
    "prettier": "^3.0.0",
    "typescript": "^5.1.6"
  }
}`;

/**
 * Use `npm run demo` and check in .demo folder
 */

execSync("npm run build");

const testDir = path.join(process.cwd(), "./.demo");

fs.rmSync(testDir, { recursive: true, force: true });
fs.mkdirSync(testDir);
fs.writeFileSync(path.join(testDir, "package.json"), pkgJson);

execSync(`node ${esbuildOptions.outfile} ${process.argv.slice(2)}`, {
  cwd: testDir,
  stdio: "inherit",
});
