#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const USAGE = `Usage: npm run new:feature -- <name> "<one sentence: what a user can do>"

  <name>      kebab-case folder name under features/, e.g. speaker-notes
  <sentence>  becomes the first line of FEATURE.md and the FEATURE_MAP.md row

Creates features/<name>/ with index.ts, <name>.tsx, tests/<name>.test.tsx and
FEATURE.md, and adds the feature's row to FEATURE_MAP.md.
`;

function fail(message) {
  console.error(`new-feature: ${message}\n`);
  console.error(USAGE);
  process.exit(1);
}

const [name, sentence, ...rest] = process.argv.slice(2);
if (name === "--help" || name === "-h") {
  console.log(USAGE);
  process.exit(0);
}
if (!name || !sentence || rest.length > 0) {
  fail("expected exactly two arguments: <name> and <sentence>");
}
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  fail(
    `"${name}" is not kebab-case (lowercase letters, digits, single dashes)`
  );
}
if (name === "tests" || name === "api") {
  fail(`"${name}" is reserved`);
}
if (!/[A-Za-z]/.test(sentence) || sentence.includes("|")) {
  fail("the sentence must be plain text without | characters");
}

const featureDir = join(projectRoot, "features", name);
if (existsSync(featureDir)) {
  fail(`features/${name} already exists; refusing to overwrite`);
}

const pascal = name
  .split("-")
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join("");
const title = name[0].toUpperCase() + name.slice(1).replaceAll("-", " ");
const summary = /[.!?]$/.test(sentence.trim())
  ? sentence.trim()
  : `${sentence.trim()}.`;

const files = {
  "index.ts": `export { ${pascal} } from "./${name}";\n`,
  [`${name}.tsx`]: `export function ${pascal}() {
  return <section aria-label="${title}" />;
}
`,
  [`tests/${name}.test.tsx`]: `// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ${pascal} } from "../${name}";

describe("${pascal}", () => {
  it("renders the ${title.toLowerCase()} region", () => {
    render(<${pascal} />);
    expect(screen.getByRole("region", { name: "${title}" })).toBeInTheDocument();
  });
});
`,
  "FEATURE.md": `# ${title}

${summary}

## ${title}

- Describe one thing a user can do here, as observable behaviour.

## Files

- \`index.ts\`: public surface
- \`${name}.tsx\`: the ${title.toLowerCase()} component
- \`tests/${name}.test.tsx\`: renders the ${title.toLowerCase()} region
`,
};

mkdirSync(join(featureDir, "tests"), { recursive: true });
for (const [relPath, contents] of Object.entries(files)) {
  writeFileSync(join(featureDir, relPath), contents);
}

const mapPath = join(projectRoot, "FEATURE_MAP.md");
const map = readFileSync(mapPath, "utf8").split("\n");
const header = map.findIndex((line) => /^\|\s*Feature\s*\|/.test(line));
if (header === -1) {
  fail("FEATURE_MAP.md has no Features table");
}
let end = header + 2;
while (end < map.length && map[end].startsWith("|")) {
  end += 1;
}
const rows = map.slice(header + 2, end);
const newRow = `| [${name}](features/${name}/FEATURE.md) | ${summary} | |`;
const insertAt = rows.findIndex((row) => {
  const match = /^\|\s*\[([^\]]+)\]/.exec(row);
  return match !== null && match[1].localeCompare(name) > 0;
});
rows.splice(insertAt === -1 ? rows.length : insertAt, 0, newRow);
map.splice(header + 2, end - header - 2, ...rows);
writeFileSync(mapPath, map.join("\n"));

const created = Object.keys(files).map((relPath) =>
  join("features", name, relPath)
);
const prettier = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prettier", "--write", "--log-level", "warn", ...created, "FEATURE_MAP.md"],
  { cwd: projectRoot, stdio: "inherit" }
);
if (prettier.status !== 0) {
  console.error("new-feature: prettier failed; run `npm run fix`");
  process.exit(1);
}

console.log(`Created features/${name}/:`);
for (const relPath of created) {
  console.log(`  ${relPath}`);
}
console.log(`Added the ${name} row to FEATURE_MAP.md.

Next steps:
  1. Describe the behaviour in features/${name}/FEATURE.md (by sub-feature,
     ending with ## Files), and list any names users call it under "Also
     called" in FEATURE_MAP.md.
  2. Write the test for the first behaviour in features/${name}/tests/.
  3. Implement in features/${name}/ and export public pieces from index.ts.
  4. npm run check:feature -- ${name}
  5. npm run check`);
