#!/usr/bin/env node
// Scoped check: `npm run check:feature -- <feature|path>`.
// Runs prettier, eslint and vitest on one folder, then the (global, fast)
// structure check and the typecheck. A loop of seconds while iterating; run
// `npm run check` before declaring done.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];

function usage(message) {
  if (message) console.error(message);
  console.error(
    "Usage: npm run check:feature -- <feature|path>\n" +
      "  <feature>  a folder name under features/ (e.g. deck)\n" +
      "  <path>     any folder inside the app (e.g. lib, views/slideshow-app)"
  );
  process.exit(1);
}

if (!arg || arg.startsWith("-")) usage();

let target = null;
for (const candidate of [path.join("features", arg), arg]) {
  const abs = path.resolve(root, candidate);
  if (
    abs.startsWith(root) &&
    fs.existsSync(abs) &&
    fs.statSync(abs).isDirectory()
  ) {
    target = path.relative(root, abs) || ".";
    break;
  }
}
if (!target) {
  const features = fs.existsSync(path.join(root, "features"))
    ? fs.readdirSync(path.join(root, "features")).join(", ")
    : "(none yet)";
  usage(`"${arg}" is neither a feature nor a folder. Features: ${features}`);
}

const hasTests = fs
  .readdirSync(path.join(root, target), { recursive: true })
  .some((f) => /\.test\.(ts|tsx)$/.test(String(f)));

const steps = [
  ["format", "npx", ["prettier", "--check", target]],
  ["lint", "npx", ["eslint", target, "--max-warnings", "0"]],
  ...(hasTests
    ? [["test", "npx", ["vitest", "run", target]]]
    : [["test", null, `no *.test.ts(x) under ${target}; skipped`]]),
  ["structure", "node", ["scripts/check-structure.mjs"]],
  ["typecheck", "npx", ["tsc", "--noEmit"]],
];

for (const [name, cmd, args] of steps) {
  if (!cmd) {
    console.log(`[${name}] ${args}`);
    continue;
  }
  console.log(`[${name}] ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\nScoped check failed at ${name} for ${target}.`);
    process.exit(1);
  }
}

console.log(
  `\nScoped check passed for ${target}. Run \`npm run check\` before declaring done.`
);
