import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];

if (!arg) {
  console.error(`Usage: npm run check:feature -- <path>

  npm run check:feature -- features/channels
  npm run check:feature -- views/rail
  npm run check:feature -- primitives
  npm run check:feature -- lib/feeds.ts
`);
  process.exit(1);
}

function insideRoot(candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function resolveTarget(input) {
  const direct = path.resolve(root, input);
  if (insideRoot(direct) && existsSync(direct)) return direct;
  for (const prefix of ["features", "views"]) {
    const candidate = path.join(root, prefix, input);
    if (existsSync(candidate)) return candidate;
  }
  console.error(`No such path: ${input}`);
  process.exit(1);
}

function testForSource(relative) {
  const dir = path.dirname(relative);
  const base = path.basename(relative).replace(/\.(client\.)?tsx?$/, "");
  for (const extension of ["ts", "tsx"]) {
    const candidate = path.join(dir, "tests", `${base}.test.${extension}`);
    if (existsSync(path.join(root, candidate))) return candidate;
  }
  return null;
}

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  try {
    execFileSync(command, args, { cwd: root, stdio: "inherit" });
  } catch (error) {
    process.exit(typeof error.status === "number" ? error.status : 1);
  }
}

const target = resolveTarget(arg);
const relative = path.relative(root, target);
const lintPaths = [relative];
let vitestPath = relative;

if (statSync(target).isFile()) {
  const testFile = testForSource(relative);
  if (testFile) {
    lintPaths.push(testFile);
    vitestPath = testFile;
  }
}

run(process.execPath, ["scripts/check-structure.mjs"]);
run("npx", ["eslint", ...lintPaths, "--max-warnings", "0"]);
run("npx", ["prettier", "--check", ...lintPaths]);
run("npx", ["vitest", "run", vitestPath]);

console.log(`\nScoped check passed for ${relative}.`);
