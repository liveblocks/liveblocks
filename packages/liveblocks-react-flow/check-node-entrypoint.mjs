/**
 * Post-build check that verifies the /node entry point does not transitively
 * depend on React or other browser-only packages. Uses esbuild to temporarily
 * bundle dist/node.js in memory, then checks which external packages remain.
 */
import { build } from "esbuild";

const result = await build({
  entryPoints: ["dist/node.js"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  packages: "external",
});

const code = result.outputFiles[0].text;

// Only these packages are allowed as external dependencies of the /node entry point
const allowed = [
  "@liveblocks/core",
  "@liveblocks/client",
  "@liveblocks/node",
];

const importPattern = /from\s+["']([^"']+)["']/g;
const errors = [];

for (const match of code.matchAll(importPattern)) {
  const dep = match[1];
  if (!allowed.some((a) => dep === a || dep.startsWith(a + "/"))) {
    errors.push(dep);
  }
}

if (errors.length > 0) {
  const unique = [...new Set(errors)];
  console.error(
    [
      `This script checks that the @liveblocks/react-flow/node subpath`,
      `only depends on server-safe packages. The /node entry is used in Node.js`,
      `backends (e.g. to mutate React Flow document state from a server). It`,
      `must NOT pull in React, browser-only, or UI packages — even transitively.`,
      ``,
      `Allowed dependencies: ${allowed.join(", ")}`,
      ``,
      `The following disallowed imports were found:`,
      ...unique.map((d) => `  - ${d}`),
    ].join("\n")
  );
  process.exit(1);
}

console.log("✓ node entry is React-free");
