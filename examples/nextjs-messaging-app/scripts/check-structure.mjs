import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_DIRS = ["app", "features", "views", "primitives", "lib", "tests"];
const CONFIG_FILES = [
  "liveblocks.config.ts",
  "next.config.ts",
  "playwright.config.ts",
  "vitest.config.ts",
  "postcss.config.mjs",
];
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mjs", ".css"]);
const LAYER_ORDER = ["lib", "primitives", "features", "views", "app"];
const COMMENT_ALLOWLIST = [
  /^\/\/ @vitest-environment\b/,
  /^\/\/ @ts-(expect-error|ignore)\b/,
  /^\/\/ eslint-disable/,
  /^\/\* eslint-disable/,
];

const errors = [];

function fail(file, message) {
  errors.push(`${path.relative(root, file)}: ${message}`);
}

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full, out);
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

function exists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

function layerOf(file) {
  const rel = path.relative(root, file).split(path.sep);
  return rel[0];
}

function featureOf(file) {
  const rel = path.relative(root, file).split(path.sep);
  return rel[0] === "features" || rel[0] === "views"
    ? `${rel[0]}/${rel[1]}`
    : null;
}

function importsOf(source) {
  const specifiers = [];
  const pattern =
    /(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|^import\s+["']([^"']+)["']/gm;
  for (const match of source.matchAll(pattern)) {
    specifiers.push(match[1] ?? match[2] ?? match[3]);
  }
  return specifiers;
}

function stripStringsAndTemplates(line) {
  return line
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function checkComments(file, source) {
  const isCss = file.endsWith(".css");
  const lines = source.split("\n");
  let inBlock = false;
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const report = (snippet) =>
      fail(
        file,
        `line ${index + 1}: comment is not allowed (${snippet}). Put the explanation in FEATURE.md, AGENTS.md tooling notes, or a test name.`
      );

    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      return;
    }

    if (isCss) {
      if (line.includes("/*")) {
        report(line);
        if (!line.includes("*/")) inBlock = true;
      }
      return;
    }

    const stripped = stripStringsAndTemplates(line);
    const blockStart = stripped.indexOf("/*");
    const lineStart = stripped.indexOf("//");

    if (blockStart !== -1 && (lineStart === -1 || blockStart < lineStart)) {
      const text = line.slice(line.indexOf("/*"));
      if (!COMMENT_ALLOWLIST.some((re) => re.test(text))) report(text);
      if (!stripped.includes("*/", blockStart + 2)) inBlock = true;
      return;
    }

    if (lineStart !== -1) {
      const text = line.slice(line.indexOf("//"));
      if (!COMMENT_ALLOWLIST.some((re) => re.test(text))) report(text);
    }
  });
}

function checkTestIds(file, source) {
  if (!/\.tsx?$/.test(file)) return;
  if (path.relative(root, file).split(path.sep).includes("tests")) return;
  source.split("\n").forEach((line, index) => {
    if (line.includes("data-testid")) {
      fail(
        file,
        `line ${index + 1}: data-testid is not allowed outside tests/. Use a role and accessible name, or a data-<entity>-id on a list row.`
      );
    }
  });
}

function checkImports(file, source) {
  const layer = layerOf(file);
  const owner = featureOf(file);
  const isRouteFile = layer === "app" && /\/api\/.*\/route\.ts$/.test(file);
  const isBarrel = owner !== null && path.basename(file) === "index.ts";
  const isTest = /\.(test|spec)\.tsx?$/.test(file);

  for (const specifier of importsOf(source)) {
    if (!specifier.startsWith("@/")) {
      if (
        specifier.startsWith(".") &&
        isBarrel &&
        specifier.includes("/api/")
      ) {
        fail(
          file,
          `barrel must not export server code (${specifier}). Drop it from index.ts; app/api routes import the handler directly.`
        );
      }
      if (specifier.startsWith("..") && owner) {
        const target = path.resolve(path.dirname(file), specifier);
        if (!target.startsWith(path.join(root, owner))) {
          fail(
            file,
            `relative import escapes ${owner} (${specifier}). Import other features and views through their index (@/features/<name>).`
          );
        }
      }
      continue;
    }

    const segments = specifier.slice(2).split("/");
    const targetLayer = segments[0];

    if (targetLayer === "tests") {
      if (!isTest && layer !== "tests") {
        fail(
          file,
          `only tests may import test helpers (${specifier}). Move shared production code to lib/ or primitives/.`
        );
      }
      continue;
    }

    if (!LAYER_ORDER.includes(targetLayer)) {
      fail(
        file,
        `unknown layer in import (${specifier}). Use @/lib, @/primitives, @/features, @/views, or @/tests.`
      );
      continue;
    }

    if (layer === "tests") {
      continue;
    }

    const from = LAYER_ORDER.indexOf(layer);
    const to = LAYER_ORDER.indexOf(targetLayer);
    if (to > from) {
      fail(
        file,
        `${layer} may not import from ${targetLayer} (${specifier}). Move the shared piece down to a layer ${layer} is allowed to import.`
      );
    }

    if (targetLayer === "features" || targetLayer === "views") {
      const target = `${segments[0]}/${segments[1]}`;
      const deep = segments.length > 2;
      if (deep) {
        const isApiHandler = segments[2] === "api";
        if (isRouteFile && isApiHandler) continue;
        if (isTest && owner === target) continue;
        fail(
          file,
          `deep import (${specifier}). Export it from ${target}/index.ts and import @/${target}.`
        );
      }
      if (layer === "app" && !isRouteFile && targetLayer === "features") {
        fail(
          file,
          `app may only import views, plus feature API handlers from route files (${specifier}).`
        );
      }
    }
  }
}

function checkAnatomy() {
  const featureMapFile = path.join(root, "FEATURE_MAP.md");
  const featureMap = exists(featureMapFile)
    ? readFileSync(featureMapFile, "utf8")
    : "";

  for (const kind of ["features", "views"]) {
    const dir = path.join(root, kind);
    if (!exists(dir)) continue;
    for (const name of readdirSync(dir)) {
      const folder = path.join(dir, name);
      if (!statSync(folder).isDirectory()) continue;
      if (!exists(path.join(folder, "index.ts"))) {
        fail(folder, "missing index.ts. Add one that lists named exports.");
      }
      const doc = path.join(folder, "FEATURE.md");
      if (!exists(doc) || readFileSync(doc, "utf8").trim() === "") {
        fail(
          folder,
          "missing FEATURE.md. Describe the user-observable behaviour and list the files."
        );
      } else if (
        !new RegExp(`${kind}/${name}/FEATURE\\.md(?![\\w.])`).test(featureMap)
      ) {
        fail(
          doc,
          "not linked from FEATURE_MAP.md. Add a row to the Features or Views table."
        );
      }
      const tests = path.join(folder, "tests");
      const testFiles = exists(tests)
        ? readdirSync(tests).filter((f) => /\.(test|spec)\.tsx?$/.test(f))
        : [];
      if (testFiles.length === 0) {
        fail(folder, "tests/ needs at least one *.test.* or *.spec.* file.");
      }
      const api = path.join(folder, "api");
      if (exists(api)) {
        const index = readFileSync(path.join(folder, "index.ts"), "utf8");
        if (index.includes('"./api/') || index.includes("'./api/")) {
          fail(
            path.join(folder, "index.ts"),
            "barrel must not export ./api/. API handlers stay server-only."
          );
        }
      }
    }
  }

  for (const kind of ["lib", "primitives"]) {
    const dir = path.join(root, kind);
    if (!exists(dir)) continue;
    const tests = path.join(dir, "tests");
    const testFiles = exists(tests) ? readdirSync(tests) : [];
    for (const file of readdirSync(dir)) {
      if (!/\.tsx?$/.test(file)) continue;
      if (/\.test\.tsx?$/.test(file)) {
        fail(
          path.join(dir, file),
          `test file belongs in ${kind}/tests/, next to the other tests for that layer.`
        );
        continue;
      }
      const base = file.replace(/\.(client\.)?tsx?$/, "");
      const hasTest = testFiles.some((f) =>
        new RegExp(`^${base}\\.test\\.tsx?$`).test(f)
      );
      if (!hasTest) {
        fail(
          path.join(dir, file),
          `missing ${kind}/tests/${base}.test.ts(x). Add a test named after the module.`
        );
      }
    }
  }

  for (const kind of ["features", "views"]) {
    const dir = path.join(root, kind);
    if (!exists(dir)) continue;
    for (const name of readdirSync(dir)) {
      const folder = path.join(dir, name);
      if (!statSync(folder).isDirectory()) continue;
      for (const file of readdirSync(folder)) {
        if (/\.(test|spec)\.tsx?$/.test(file)) {
          fail(
            path.join(folder, file),
            "test file belongs in tests/, not beside the source."
          );
        }
      }
    }
  }

  const stray = [
    "components",
    "tests/unit",
    "tests/api",
    "tests/components",
    "tests/e2e",
  ];
  for (const dir of stray) {
    if (exists(path.join(root, dir))) {
      fail(
        path.join(root, dir),
        "legacy directory must not exist. Tests live next to the code they cover."
      );
    }
  }
}

function checkBarrels(files) {
  for (const file of files) {
    if (featureOf(file) && path.basename(file) === "index.ts") {
      const source = readFileSync(file, "utf8");
      if (/export\s+\*/.test(source)) {
        fail(
          file,
          "barrels must list named exports. Replace export * with explicit names."
        );
      }
    }
  }
}

function checkFeatureCycles(files) {
  const graph = new Map();
  for (const file of files) {
    const owner = featureOf(file);
    if (!owner || !owner.startsWith("features/")) continue;
    const edges = graph.get(owner) ?? new Set();
    for (const specifier of importsOf(readFileSync(file, "utf8"))) {
      const match = specifier.match(/^@\/(features\/[^/]+)/);
      if (match && match[1] !== owner) edges.add(match[1]);
    }
    graph.set(owner, edges);
  }

  const visiting = new Set();
  const done = new Set();
  const visit = (node, trail) => {
    if (done.has(node)) return;
    if (visiting.has(node)) {
      const cycle = [...trail.slice(trail.indexOf(node)), node].join(" -> ");
      errors.push(`feature cycle: ${cycle}. Move the shared piece to lib/.`);
      return;
    }
    visiting.add(node);
    for (const next of graph.get(node) ?? []) visit(next, [...trail, node]);
    visiting.delete(node);
    done.add(node);
  };
  for (const node of graph.keys()) visit(node, []);
}

const files = [
  ...SOURCE_DIRS.flatMap((dir) => walk(path.join(root, dir))),
  ...CONFIG_FILES.map((f) => path.join(root, f)).filter(exists),
  ...walk(path.join(root, "scripts")),
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  checkComments(file, source);
  if (/\.tsx?$/.test(file)) {
    checkImports(file, source);
    checkTestIds(file, source);
  }
}
checkAnatomy();
checkBarrels(files);
checkFeatureCycles(files);

if (errors.length > 0) {
  console.error(`Structure check failed with ${errors.length} problem(s):\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`Structure check passed (${files.length} files).`);
