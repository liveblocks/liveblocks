import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [kind, name] = process.argv.slice(2);

const KINDS = ["feature", "view", "primitive"];

function usage(message) {
  if (message) console.error(`\n${message}\n`);
  console.error(`Usage: node scripts/scaffold.mjs <${KINDS.join("|")}> <kebab-name>

  npm run new:feature -- reactions
  npm run new:view -- settings-panel
  npm run new:primitive -- tooltip
`);
  process.exit(1);
}

if (!KINDS.includes(kind)) usage(`Unknown kind "${kind ?? ""}".`);
if (!name || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  usage(`Name must be kebab-case, got "${name ?? ""}".`);
}

const pascal = name
  .split("-")
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join("");
const title = name[0].toUpperCase() + name.slice(1).replace(/-/g, " ");

function write(relative, contents) {
  const file = path.join(root, relative);
  if (existsSync(file)) {
    console.error(`Refusing to overwrite ${relative}`);
    process.exit(1);
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, contents);
  console.log(`created ${relative}`);
}

function folderScaffold(layer) {
  const dir = `${layer}/${name}`;
  const importPath = `@/${layer}/${name}`;
  write(
    `${dir}/${name}.tsx`,
    `export function ${pascal}() {
  return <div data-testid="${name}">${title}</div>;
}
`
  );
  write(`${dir}/index.ts`, `export { ${pascal} } from "./${name}";\n`);
  write(
    `${dir}/tests/${name}.test.tsx`,
    `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ${pascal} } from "${importPath}";

describe("${pascal}", () => {
  it("renders", () => {
    render(<${pascal} />);
    expect(screen.getByTestId("${name}")).toBeInTheDocument();
  });
});
`
  );
  write(
    `${dir}/FEATURE.md`,
    `# ${title}

Describe what a user can see and do here. Keep it to observable behaviour;
implementation lives in the code.

## Files

- \`${dir}/${name}.tsx\`
- Tests: \`tests/\`
`
  );
  console.log(`
Next steps:
  1. Add a row for ${dir} to the ${layer === "features" ? "Features" : "Views"} table in FEATURE_MAP.md
     (lint:structure fails until it is linked).
  2. Add it to the ${layer === "features" ? "Feature inventory" : "Views"} section of AGENTS.md.
  3. Import it through "${importPath}" only.
  4. npm run check
`);
}

if (kind === "feature") folderScaffold("features");
if (kind === "view") folderScaffold("views");
if (kind === "primitive") {
  write(
    `primitives/${name}.tsx`,
    `export function ${pascal}() {
  return <span data-testid="${name}">${title}</span>;
}
`
  );
  write(
    `primitives/tests/${name}.test.tsx`,
    `import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ${pascal} } from "@/primitives/${name}";

describe("${pascal}", () => {
  it("renders", () => {
    render(<${pascal} />);
    expect(screen.getByTestId("${name}")).toBeInTheDocument();
  });
});
`
  );
  console.log(`
Next steps:
  1. Add it to the Primitives section of AGENTS.md and the Shared code table in FEATURE_MAP.md.
  2. npm run check
`);
}
