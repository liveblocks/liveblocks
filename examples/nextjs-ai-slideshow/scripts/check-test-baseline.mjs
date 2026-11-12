#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(projectRoot, "tests", "baseline.json");
const baselineRel = relative(projectRoot, baselinePath);

const USAGE = `Usage: npm run test:baseline [-- --check]

Runs the unit tests (Vitest) and lists the e2e tests (Playwright), then
compares the counts with ${baselineRel}.
  fewer than the baseline        -> fails (tests may only be removed deliberately)
  more, run locally              -> rewrites ${baselineRel}; commit it
  more, in CI (CI env var set)   -> fails as stale
  --check                        -> never writes, in any environment
`;

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(USAGE);
  process.exit(0);
}
const checkOnly = args.includes("--check");
const unknown = args.filter((arg) => arg !== "--check");
if (unknown.length > 0) {
  console.error(
    `test-baseline: unknown argument ${unknown.join(" ")}\n${USAGE}`
  );
  process.exit(1);
}

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function runVitest() {
  const dir = mkdtempSync(join(tmpdir(), "vitest-baseline-"));
  const outputFile = join(dir, "results.json");
  const result = spawnSync(
    npx,
    [
      "vitest",
      "run",
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${outputFile}`,
    ],
    { cwd: projectRoot, stdio: ["ignore", "inherit", "inherit"] }
  );
  if (!existsSync(outputFile)) {
    rmSync(dir, { recursive: true, force: true });
    return {
      ok: false,
      files: 0,
      tests: 0,
      reason: "vitest produced no JSON report",
    };
  }
  const report = JSON.parse(readFileSync(outputFile, "utf8"));
  rmSync(dir, { recursive: true, force: true });
  return {
    ok: result.status === 0 && report.success === true,
    files: report.testResults.length,
    tests: report.numTotalTests,
    reason: result.status === 0 ? "" : "vitest exited non-zero",
  };
}

function listPlaywright() {
  const result = spawnSync(npx, ["playwright", "test", "--list"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, PORT: process.env.PORT ?? "3999" },
  });
  const output = `${result.stdout}\n${result.stderr}`;
  const match = output.match(/Total:\s+(\d+)\s+tests? in\s+(\d+)\s+files?/);
  if (!match) {
    return {
      ok: false,
      files: 0,
      tests: 0,
      reason: output.trim().split("\n").slice(-3).join(" | "),
    };
  }
  return {
    ok: result.status === 0,
    files: Number(match[2]),
    tests: Number(match[1]),
    reason: "",
  };
}

const current = { vitest: runVitest(), playwright: listPlaywright() };
const failures = [];

for (const [runner, counts] of Object.entries(current)) {
  if (!counts.ok) {
    failures.push(
      `${baselineRel}: test-baseline — ${runner} did not complete (${counts.reason || "see output above"}). Fix: make the ${runner} run green, then rerun \`npm run test:baseline\`.`
    );
  }
}

if (failures.length === 0) {
  const baseline = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : null;
  const summary = Object.entries(current)
    .map(
      ([runner, counts]) =>
        `${runner} ${counts.tests} tests in ${counts.files} files`
    )
    .join(", ");

  if (!baseline) {
    if (checkOnly) {
      failures.push(
        `${baselineRel}: test-baseline — no baseline file. Fix: run \`npm run test:baseline\` without --check to create it, then commit it.`
      );
    } else {
      writeBaseline();
      console.log(`Baseline created (${summary}); commit ${baselineRel}.`);
    }
  } else {
    let higher = false;
    for (const [runner, counts] of Object.entries(current)) {
      const expected = baseline[runner] ?? { files: 0, tests: 0 };
      if (counts.tests < expected.tests || counts.files < expected.files) {
        failures.push(
          `${baselineRel}: test-baseline — ${runner} has ${counts.tests} tests in ${counts.files} files, baseline is ${expected.tests} in ${expected.files}. Tests may only be removed deliberately. Fix: restore the missing tests, or lower the baseline by hand and say so in the PR.`
        );
      } else if (
        counts.tests > expected.tests ||
        counts.files > expected.files
      ) {
        higher = true;
      }
    }
    if (failures.length === 0) {
      if (higher && process.env.CI) {
        failures.push(
          `${baselineRel}: test-baseline — stale baseline (${summary}). Fix: run \`npm run test:baseline\` locally and commit ${baselineRel}.`
        );
      } else if (higher && !checkOnly) {
        writeBaseline();
        console.log(`Baseline raised (${summary}); commit ${baselineRel}.`);
      } else if (higher) {
        console.log(
          `Baseline check passed, but counts rose (${summary}); run \`npm run test:baseline\` to record them.`
        );
      } else {
        console.log(`Baseline check passed (${summary}).`);
      }
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  console.error(
    `${failures.length} test-baseline failure${failures.length === 1 ? "" : "s"}.`
  );
  process.exit(1);
}

function writeBaseline() {
  const data = Object.fromEntries(
    Object.entries(current).map(([runner, counts]) => [
      runner,
      { files: counts.files, tests: counts.tests },
    ])
  );
  writeFileSync(baselinePath, `${JSON.stringify(data, null, 2)}\n`);
}
