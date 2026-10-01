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
      fail(file, `line ${index + 1}: comment is not allowed: ${snippet}`);

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
        fail(file, `barrel must not export server code: ${specifier}`);
      }
      if (specifier.startsWith("..") && owner) {
        const target = path.resolve(path.dirname(file), specifier);
        if (!target.startsWith(path.join(root, owner))) {
          fail(file, `relative import escapes ${owner}: ${specifier}`);
        }
      }
      continue;
    }

    const segments = specifier.slice(2).split("/");
    const targetLayer = segments[0];

    if (targetLayer === "tests") {
      if (!isTest && layer !== "tests") {
        fail(file, `only tests may import test helpers: ${specifier}`);
      }
      continue;
    }

    if (!LAYER_ORDER.includes(targetLayer)) {
      fail(file, `unknown layer in import: ${specifier}`);
      continue;
    }

    if (layer === "tests") {
      continue;
    }

    const from = LAYER_ORDER.indexOf(layer);
    const to = LAYER_ORDER.indexOf(targetLayer);
    if (to > from) {
      fail(file, `${layer} may not import from ${targetLayer}: ${specifier}`);
    }

    if (targetLayer === "features" || targetLayer === "views") {
      const target = `${segments[0]}/${segments[1]}`;
      const deep = segments.length > 2;
      if (deep) {
        const isApiHandler = segments[2] === "api";
        if (isRouteFile && isApiHandler) continue;
        if (isTest && owner === target) continue;
        fail(file, `deep import; use @/${target} instead: ${specifier}`);
      }
      if (layer === "app" && !isRouteFile && targetLayer === "features") {
        fail(file, `app may only import views: ${specifier}`);
      }
    }
  }
}

function checkAnatomy() {
  for (const kind of ["features", "views"]) {
    const dir = path.join(root, kind);
    if (!exists(dir)) continue;
    for (const name of readdirSync(dir)) {
      const folder = path.join(dir, name);
      if (!statSync(folder).isDirectory()) continue;
      if (!exists(path.join(folder, "index.ts"))) {
        fail(folder, "missing index.ts");
      }
      const tests = path.join(folder, "tests");
      const testFiles = exists(tests)
        ? readdirSync(tests).filter((f) => /\.(test|spec)\.tsx?$/.test(f))
        : [];
      if (testFiles.length === 0) {
        fail(
          folder,
          "tests/ must contain at least one *.test.* or *.spec.* file"
        );
      }
      const api = path.join(folder, "api");
      if (exists(api)) {
        const index = readFileSync(path.join(folder, "index.ts"), "utf8");
        if (index.includes('"./api/') || index.includes("'./api/")) {
          fail(path.join(folder, "index.ts"), "barrel must not export ./api/");
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
        fail(path.join(dir, file), `test files belong in ${kind}/tests/`);
        continue;
      }
      const base = file.replace(/\.(client\.)?tsx?$/, "");
      const hasTest = testFiles.some((f) =>
        new RegExp(`^${base}\\.test\\.tsx?$`).test(f)
      );
      if (!hasTest) {
        fail(path.join(dir, file), `missing ${kind}/tests/${base}.test.ts(x)`);
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
          fail(path.join(folder, file), "test files belong in tests/");
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
      fail(path.join(root, dir), "legacy directory must not exist");
    }
  }
}

function checkBarrels(files) {
  for (const file of files) {
    if (featureOf(file) && path.basename(file) === "index.ts") {
      const source = readFileSync(file, "utf8");
      if (/export\s+\*/.test(source)) {
        fail(file, "barrels must list named exports, not export *");
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
      errors.push(`feature cycle: ${cycle}`);
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
  if (/\.tsx?$/.test(file)) checkImports(file, source);
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
