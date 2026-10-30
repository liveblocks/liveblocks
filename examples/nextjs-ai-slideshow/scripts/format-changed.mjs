#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const IGNORED_SEGMENTS = [
  "node_modules/",
  ".next/",
  "playwright-report/",
  "test-results/",
  "coverage/",
  ".lb-dev/",
];
const IGNORED_FILES = ["package-lock.json"];

function readStdin() {
  if (process.stdin.isTTY) {
    return "";
  }
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function pathsFromPayload(raw) {
  if (!raw.trim()) {
    return [];
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return [];
  }
  const candidates = [
    payload?.tool_input?.file_path,
    payload?.tool_input?.path,
    payload?.file_path,
  ].filter((value) => typeof value === "string");
  const roots = Array.isArray(payload?.workspace_roots)
    ? payload.workspace_roots
    : [];
  const base = process.env.CLAUDE_PROJECT_DIR ?? roots[0] ?? projectRoot;
  return candidates.map((value) =>
    isAbsolute(value) ? value : resolve(base, value)
  );
}

function shouldFormat(absolutePath) {
  const rel = relative(projectRoot, absolutePath);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return false;
  }
  if (!existsSync(absolutePath)) {
    return false;
  }
  if (IGNORED_SEGMENTS.some((segment) => rel.includes(segment))) {
    return false;
  }
  if (IGNORED_FILES.includes(rel)) {
    return false;
  }
  return true;
}

const argPaths = process.argv
  .slice(2)
  .map((value) => (isAbsolute(value) ? value : resolve(process.cwd(), value)));
const paths = argPaths.length > 0 ? argPaths : pathsFromPayload(readStdin());

for (const file of paths) {
  if (!shouldFormat(file)) {
    continue;
  }
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prettier", "--write", "--ignore-unknown", "--log-level", "warn", file],
    { cwd: projectRoot, stdio: ["ignore", "inherit", "pipe"] }
  );
  if (result.status !== 0) {
    const stderr = result.stderr?.toString().trim().split("\n")[0] ?? "";
    console.log(
      `format-changed: prettier could not format ${relative(projectRoot, file)}${stderr ? ` (${stderr})` : ""}; \`npm run check\` will catch it.`
    );
  }
}

process.exit(0);
