import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = path.join(root, "tests", "baseline.json");
const resultsFile = path.join(root, "test-results", "vitest.json");

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function vitestCounts() {
  if (!existsSync(resultsFile)) {
    console.error(
      `Missing ${path.relative(root, resultsFile)}. Run "npm run test:baseline" (it runs vitest with the JSON reporter first).`
    );
    process.exit(1);
  }
  const results = readJson(resultsFile);
  return {
    files: results.testResults.length,
    tests: results.numTotalTests,
  };
}

function playwrightCounts() {
  const output = execFileSync(
    "npx",
    ["playwright", "test", "--list", "--reporter=list"],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
  const match = output.match(/Total: (\d+) tests? in (\d+) files?/);
  if (!match) {
    console.error("Could not parse Playwright test list output.");
    process.exit(1);
  }
  return { files: Number(match[2]), tests: Number(match[1]) };
}

const current = { vitest: vitestCounts(), playwright: playwrightCounts() };
const baseline = existsSync(baselineFile)
  ? readJson(baselineFile)
  : { vitest: { files: 0, tests: 0 }, playwright: { files: 0, tests: 0 } };

const problems = [];
let grew = false;

for (const runner of ["vitest", "playwright"]) {
  for (const key of ["files", "tests"]) {
    const was = baseline[runner][key];
    const now = current[runner][key];
    if (now < was) {
      problems.push(`${runner} ${key}: ${was} -> ${now}`);
    } else if (now > was) {
      grew = true;
    }
  }
}

if (problems.length) {
  console.error(`Test baseline check failed. Tests were lost:\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\nTests may only be removed deliberately. If this is intended, say so in the PR and update tests/baseline.json by hand.`
  );
  process.exit(1);
}

if (grew) {
  writeFileSync(baselineFile, `${JSON.stringify(current, null, 2)}\n`);
  console.log(
    `Test baseline grew; updated ${path.relative(root, baselineFile)} (commit it):`
  );
} else {
  console.log("Test baseline unchanged:");
}
console.log(
  `  vitest ${current.vitest.tests} tests in ${current.vitest.files} files, playwright ${current.playwright.tests} tests in ${current.playwright.files} files`
);
