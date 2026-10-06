#!/usr/bin/env node
// Boundary checker. Rules and settings: scripts/structure.config.json.
//
//   node scripts/check-structure.mjs                  run every rule
//   node scripts/check-structure.mjs --graph           all feature -> feature edges
//   node scripts/check-structure.mjs --graph <f>       what <f> depends on
//   node scripts/check-structure.mjs --graph <f> --reverse   who depends on <f>
//   node scripts/check-structure.mjs --owner <path>... owning feature/layer + doc
//
// Failures print `path:line: rule — what's wrong. Fix: what to do.`
// Legacy paths (config.legacy, mirrored in FEATURE_MAP.md "Not yet migrated")
// are skipped by every rule until they're gone.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/structure.config.json"), "utf8")
);

const SOURCE_EXT = /\.(ts|tsx|mts|js|jsx|mjs)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx)$/;
const MAGIC_COMMENT =
  /^\s*(\/\/\/\s*<reference|\/\/\s*@ts-(expect-error|ignore|nocheck|check)|\/\/\s*@vitest-environment|\/\/\s*(eslint|prettier|biome)-|\/\*\s*(eslint|prettier|biome)-|\/\/\s*#__|\/\*\s*@__)/;

const failures = [];
const warnings = [];
function fail(file, line, rule, problem, fix) {
  failures.push(
    `${file}${line ? `:${line}` : ""}: ${rule} — ${problem} Fix: ${fix}`
  );
}
function warn(file, rule, text) {
  warnings.push(`warning: ${file}: ${rule} — ${text}`);
}

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
        i += glob[i + 2] === "/" ? 2 : 1;
      } else {
        re += "[^/]*";
      }
    } else if (c === "<") {
      const end = glob.indexOf(">", i);
      re += "[^/]+";
      i = end;
    } else {
      re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}
const matchesAny = (file, globs) =>
  globs.some((g) =>
    g.endsWith("/") ? file.startsWith(g) : globToRegExp(g).test(file)
  );

const legacyGlobs = Object.keys(config.legacy);
const isLegacy = (file) => matchesAny(file, legacyGlobs);

function listFiles() {
  const out = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" }
  );
  return out
    .split("\0")
    .filter((f) => f && fs.existsSync(path.join(root, f)))
    .filter((f) => !f.startsWith("node_modules/"));
}

const allFiles = listFiles();
const files = allFiles.filter((f) => !isLegacy(f));
const sourceFiles = files.filter((f) => SOURCE_EXT.test(f));
const layerNames = Object.keys(config.layers);

const layerOf = (file) => {
  const top = file.split("/")[0];
  return layerNames.includes(top) ? top : null;
};
const featureOf = (file) => {
  const parts = file.split("/");
  return parts[0] === config.featureRoot && parts.length > 2 ? parts[1] : null;
};
const viewOf = (file) => {
  const parts = file.split("/");
  return parts[0] === config.viewRoot && parts.length > 2 ? parts[1] : null;
};
const isTestFile = (file) =>
  TEST_FILE.test(file) ||
  file.startsWith("tests/") ||
  /(^|\/)tests\//.test(file) ||
  /(vitest|playwright)\.config\./.test(file);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

function listDir(dir) {
  return allFiles.filter((f) => f.startsWith(dir + "/"));
}
const features = exists(config.featureRoot)
  ? fs
      .readdirSync(path.join(root, config.featureRoot), {
        withFileTypes: true,
      })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [];
const views = exists(config.viewRoot)
  ? fs
      .readdirSync(path.join(root, config.viewRoot), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
  : [];

// ---------------------------------------------------------------- imports

const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s[^'"\n]*?\sfrom\s*['"]([^'"]+)['"]|(?:^|\n)\s*import\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]\s*\)|\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) {
    base = spec.slice(2);
  } else if (spec.startsWith(".")) {
    base = path.posix.normalize(
      path.posix.join(path.posix.dirname(fromFile), spec)
    );
  } else {
    return null;
  }
  const candidates = [
    base,
    ...["ts", "tsx", "mts", "js", "jsx", "mjs"].map((e) => `${base}.${e}`),
    ...["ts", "tsx", "js"].map((e) => `${base}/index.${e}`),
  ];
  return (
    candidates.find(
      (c) => exists(c) && fs.statSync(path.join(root, c)).isFile()
    ) ?? base
  );
}

function importsOf(file) {
  const text = read(file);
  const result = [];
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    const line =
      text.slice(0, m.index).split("\n").length +
      (m[0].startsWith("\n") ? 1 : 0);
    const target = resolveImport(file, spec);
    if (target) result.push({ spec, target, line });
  }
  return result;
}

const importGraph = new Map(sourceFiles.map((f) => [f, importsOf(f)]));

function featureEdges() {
  const edges = new Map(features.map((f) => [f, new Set()]));
  for (const [file, imports] of importGraph) {
    const from = featureOf(file);
    if (!from) continue;
    for (const { target } of imports) {
      const to = featureOf(target);
      if (to && to !== from && !isLegacy(target)) edges.get(from)?.add(to);
    }
  }
  return edges;
}

// ------------------------------------------------------------------ rules

function ruleLayer() {
  for (const [file, imports] of importGraph) {
    const from = layerOf(file);
    if (!from) continue;
    for (const { target, line } of imports) {
      if (isLegacy(target)) continue;
      const to = layerOf(target);
      if (!to || to === from) continue;
      if (!config.layers[from].includes(to)) {
        fail(
          file,
          line,
          "layer",
          `${from}/ may not import ${target}.`,
          `move the shared piece to lib/ (or a lower layer), or pass it in as a prop.`
        );
      }
    }
  }
}

function rulePublicSurface() {
  const deep = config.allowedDeepImports.map((d) => ({
    from: globToRegExp(d.from),
    to: globToRegExp(d.to),
  }));
  for (const [file, imports] of importGraph) {
    const fromFeature = featureOf(file);
    for (const { target, line } of imports) {
      const toFeature = featureOf(target);
      if (!toFeature || toFeature === fromFeature || isLegacy(target)) continue;
      const surface = `${config.featureRoot}/${toFeature}/${config.surfaceFile}`;
      if (target === surface) continue;
      if (deep.some((d) => d.from.test(file) && d.to.test(target))) continue;
      fail(
        file,
        line,
        "public-surface",
        `imports ${target} (internal to ${toFeature}).`,
        `export what you need from ${surface} and import it from there.`
      );
    }
  }
}

function ruleCycle() {
  const edges = featureEdges();
  const state = new Map();
  const stack = [];
  const seen = new Set();
  const visit = (f) => {
    state.set(f, 1);
    stack.push(f);
    for (const to of edges.get(f) ?? []) {
      if (state.get(to) === 1) {
        const cycle = [...stack.slice(stack.indexOf(to)), to];
        const key = [...cycle].sort().join(",");
        if (!seen.has(key)) {
          seen.add(key);
          fail(
            `${config.featureRoot}/${f}`,
            null,
            "cycle",
            `features depend on each other: ${cycle.join(" -> ")}.`,
            `move the piece they share to lib/, or pass it in from views/.`
          );
        }
      } else if (!state.has(to)) {
        visit(to);
      }
    }
    stack.pop();
    state.set(f, 2);
  };
  for (const f of features) if (!state.has(f)) visit(f);
}

function ruleSurfaceShape() {
  for (const f of features) {
    const surface = `${config.featureRoot}/${f}/${config.surfaceFile}`;
    if (!exists(surface)) continue;
    const lines = read(surface).split("\n");
    lines.forEach((text, i) => {
      if (/^\s*export\s+\*/.test(text)) {
        fail(
          surface,
          i + 1,
          "surface-shape",
          "`export *` hides what the feature exposes.",
          "list the named exports explicitly."
        );
      }
      const m = text.match(/from\s*['"](\.\/[^'"]+)['"]/);
      if (m && m[1].split("/")[1] === config.serverDir) {
        fail(
          surface,
          i + 1,
          "surface-shape",
          `re-exports server-only code from ./${config.serverDir}.`,
          `keep it out of the surface; route files import ${config.featureRoot}/${f}/${config.serverDir}/* directly.`
        );
      }
    });
  }
}

function ruleTestInfra() {
  const infra = config.testInfra.map(globToRegExp);
  for (const [file, imports] of importGraph) {
    if (isTestFile(file)) continue;
    for (const { target, line } of imports) {
      if (infra.some((re) => re.test(target)) || /(^|\/)tests\//.test(target)) {
        fail(
          file,
          line,
          "test-infra",
          `production code imports test infrastructure ${target}.`,
          "move the shared piece to lib/, or keep it inside the test."
        );
      }
    }
  }
}

function ruleAnatomy() {
  for (const f of features) {
    const dir = `${config.featureRoot}/${f}`;
    if (!exists(`${dir}/${config.surfaceFile}`)) {
      fail(
        dir,
        null,
        "anatomy",
        `has no ${config.surfaceFile}.`,
        "add the public surface with named exports."
      );
    }
    if (
      !exists(`${dir}/FEATURE.md`) ||
      read(`${dir}/FEATURE.md`).trim() === ""
    ) {
      fail(
        dir,
        null,
        "anatomy",
        "has no (non-empty) FEATURE.md.",
        "describe what a user can do, by sub-feature, ending with ## Files."
      );
    }
    if (!listDir(`${dir}/tests`).some((t) => TEST_FILE.test(t))) {
      fail(
        dir,
        null,
        "anatomy",
        "has no tests/ with a *.test.ts(x) or *.spec.ts file.",
        "add one test per module under tests/."
      );
    }
  }
  for (const v of views) {
    const dir = `${config.viewRoot}/${v}`;
    if (
      !exists(`${dir}/FEATURE.md`) ||
      read(`${dir}/FEATURE.md`).trim() === ""
    ) {
      fail(
        dir,
        null,
        "anatomy",
        "has no (non-empty) FEATURE.md.",
        "describe where the view appears and what it composes, ending with ## Files."
      );
    }
  }
}

function ruleTestPlacement() {
  const allowed = [
    new RegExp(`^${config.featureRoot}/[^/]+/tests/[^/]+$`),
    new RegExp(`^${config.viewRoot}/[^/]+/tests/[^/]+$`),
    /^lib\/tests\/[^/]+$/,
    /^components\/tests\/[^/]+$/,
  ];
  for (const file of files) {
    if (!TEST_FILE.test(file)) continue;
    if (!allowed.some((re) => re.test(file))) {
      const owner = featureOf(file) ?? layerOf(file) ?? "the owning feature";
      fail(
        file,
        null,
        "test-placement",
        "test file sits outside a tests/ folder.",
        `move it to ${owner === "lib" || owner === "components" ? owner : `${config.featureRoot}/${owner}`}/tests/.`
      );
    }
  }
  const exempt = config.testExempt;
  for (const file of sourceFiles) {
    const layer = layerOf(file);
    if (layer !== "lib" && layer !== "components") continue;
    if (isTestFile(file) || matchesAny(file, exempt)) continue;
    const name = path.posix.basename(file).replace(/\.(ts|tsx)$/, "");
    const dir = path.posix.dirname(file);
    const candidates = ["ts", "tsx"].map(
      (e) => `${dir}/tests/${name}.test.${e}`
    );
    if (!candidates.some(exists)) {
      fail(
        file,
        null,
        "test-placement",
        `has no matching test.`,
        `add ${candidates[0]} (or exempt a type-only module in scripts/structure.config.json testExempt).`
      );
    }
  }
}

function firstLine(markdown) {
  return (
    markdown
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("#")) ?? ""
  );
}

function parseTables(markdown) {
  const tables = new Map();
  let current = null;
  for (const raw of markdown.split("\n")) {
    const h = raw.match(/^##\s+(.*)/);
    if (h) {
      current = h[1].trim();
      tables.set(current, []);
      continue;
    }
    if (current && /^\|/.test(raw) && !/^\|\s*-/.test(raw)) {
      const cells = raw
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      tables.get(current).push(cells);
    }
  }
  for (const rows of tables.values()) rows.shift();
  return tables;
}

function ruleFeatureMap() {
  const map = "FEATURE_MAP.md";
  if (!exists(map)) {
    fail(
      map,
      null,
      "feature-map",
      "is missing.",
      "create it next to AGENTS.md (see AGENTS.md > Adding or changing a feature)."
    );
    return;
  }
  const text = read(map);
  const tables = parseTables(text);
  const lineOf = (needle) =>
    text.split("\n").findIndex((l) => l.includes(needle)) + 1;
  const linkRe = /^\[([^\]]+)\]\(([^)]+)\)$/;
  const covered = new Set();
  const rowsFor = new Map();

  for (const [name, rows] of tables) {
    if (name === "Not yet migrated" || name === "Cross-cutting") continue;
    let previous = "";
    for (const cells of rows) {
      const m = cells[0]?.match(linkRe);
      if (!m) {
        fail(
          map,
          lineOf(cells[0] ?? ""),
          "feature-map",
          `row "${cells[0]}" has no [name](path) link.`,
          "link the first cell to the FEATURE.md, file or directory."
        );
        continue;
      }
      const [, label, target] = m;
      if (!exists(target)) {
        fail(
          map,
          lineOf(target),
          "feature-map",
          `link ${target} does not resolve.`,
          "fix the path or remove the row."
        );
      }
      if (label.localeCompare(previous) < 0) {
        fail(
          map,
          lineOf(target),
          "feature-map",
          `rows in "${name}" are not sorted ("${label}" after "${previous}").`,
          "sort the rows alphabetically by name."
        );
      }
      previous = label;
      rowsFor.set(target, (rowsFor.get(target) ?? 0) + 1);
      covered.add(target);
      if (target.endsWith("/FEATURE.md") && exists(target)) {
        const summary = firstLine(read(target));
        if (cells[1]?.replace(/\s+/g, " ") !== summary.replace(/\s+/g, " ")) {
          fail(
            map,
            lineOf(target),
            "feature-map",
            `the summary for ${label} differs from the first line of ${target}.`,
            "decide which one is right, then make them match."
          );
        }
      }
    }
  }
  for (const [target, n] of rowsFor) {
    if (n > 1)
      fail(
        map,
        lineOf(target),
        "feature-map",
        `${target} has ${n} rows.`,
        "keep exactly one."
      );
  }
  for (const f of features) {
    const doc = `${config.featureRoot}/${f}/FEATURE.md`;
    if (!covered.has(doc)) {
      fail(
        map,
        null,
        "feature-map",
        `${config.featureRoot}/${f} has no row.`,
        `add \`| [${f}](${doc}) | <first line of its FEATURE.md> | |\` to the Features table, in sorted position.`
      );
    }
  }
  for (const v of views) {
    const doc = `${config.viewRoot}/${v}/FEATURE.md`;
    if (!covered.has(doc)) {
      fail(
        map,
        null,
        "feature-map",
        `${config.viewRoot}/${v} has no row.`,
        `add \`| [${v}](${doc}) | <where it appears> |\` to the Views table.`
      );
    }
  }
  for (const file of sourceFiles) {
    const layer = layerOf(file);
    if ((layer !== "lib" && layer !== "components") || isTestFile(file))
      continue;
    const byDir = [...covered].some(
      (c) => c.endsWith("/") && file.startsWith(c)
    );
    if (!covered.has(file) && !byDir) {
      fail(
        map,
        null,
        "feature-map",
        `${file} has no row.`,
        `add \`| [${path.posix.basename(file, path.posix.extname(file))}](${file}) | <reach for it when…> |\` to the ${layer === "lib" ? "Shared code" : "Building blocks"} table.`
      );
    }
  }
  for (const dirRow of config.featureMapDirectoryRows) {
    if (exists(dirRow) && !covered.has(dirRow)) {
      fail(
        map,
        null,
        "feature-map",
        `${dirRow} has no row.`,
        "add a directory row to the Building blocks table."
      );
    }
  }

  const legacyRows = new Map(
    (tables.get("Not yet migrated") ?? []).map((cells) => [
      cells[0]?.replace(/`/g, ""),
      cells[1]?.replace(/`/g, ""),
    ])
  );
  for (const [legacyPath, target] of Object.entries(config.legacy)) {
    if (!legacyRows.has(legacyPath)) {
      fail(
        map,
        null,
        "feature-map",
        `"Not yet migrated" has no row for \`${legacyPath}\`.`,
        `add \`| \\\`${legacyPath}\\\` | \\\`${target}\\\` |\` or remove it from scripts/structure.config.json legacy.`
      );
    } else if (legacyRows.get(legacyPath) !== target) {
      fail(
        map,
        lineOf(legacyPath),
        "feature-map",
        `\`${legacyPath}\` moves to \`${target}\` in the config but \`${legacyRows.get(legacyPath)}\` in the map.`,
        "make them match."
      );
    }
  }
  for (const legacyPath of legacyRows.keys()) {
    if (!(legacyPath in config.legacy)) {
      fail(
        map,
        lineOf(legacyPath),
        "feature-map",
        `"Not yet migrated" lists \`${legacyPath}\`, which the checker config doesn't know.`,
        "add it to scripts/structure.config.json legacy, or remove the row."
      );
    }
  }
  if (legacyGlobs.length === 0 && tables.has("Not yet migrated")) {
    fail(
      map,
      lineOf("Not yet migrated"),
      "feature-map",
      'the migration is finished but the "Not yet migrated" section remains.',
      "delete the section."
    );
  }
  for (const legacyPath of legacyGlobs) {
    const stillThere = allFiles.some((f) => matchesAny(f, [legacyPath]));
    if (!stillThere) {
      fail(
        "scripts/structure.config.json",
        null,
        "feature-map",
        `legacy path \`${legacyPath}\` no longer exists.`,
        'remove it from legacy and from FEATURE_MAP.md "Not yet migrated".'
      );
    }
  }
}

function ruleFeatureFiles() {
  const dirs = [
    ...features.map((f) => `${config.featureRoot}/${f}`),
    ...views.map((v) => `${config.viewRoot}/${v}`),
  ];
  for (const dir of dirs) {
    const doc = `${dir}/FEATURE.md`;
    if (!exists(doc)) continue;
    const text = read(doc);
    const section = text.split(/^## Files\s*$/m)[1];
    if (section === undefined) {
      fail(
        doc,
        null,
        "feature-files",
        "has no `## Files` section.",
        "end the doc with `## Files` listing each file with a one-line purpose."
      );
      continue;
    }
    const listed = new Set(
      [...section.matchAll(/^\s*-\s*`([^`]+)`/gm)].map((m) => m[1])
    );
    const actual = listDir(dir)
      .map((f) => f.slice(dir.length + 1))
      .filter((f) => f !== "FEATURE.md" && !f.endsWith(".snap"));
    for (const f of actual) {
      const byDir = [...listed].some((l) => l.endsWith("/") && f.startsWith(l));
      if (!listed.has(f) && !byDir) {
        fail(
          doc,
          null,
          "feature-files",
          `${f} exists but isn't listed under ## Files.`,
          "add it with a one-line purpose."
        );
      }
    }
    for (const l of listed) {
      const ok = l.endsWith("/")
        ? actual.some((f) => f.startsWith(l))
        : actual.includes(l);
      if (!ok) {
        fail(
          doc,
          null,
          "feature-files",
          `## Files lists ${l}, which doesn't exist.`,
          "remove the line or fix the path."
        );
      }
    }
  }
}

function ruleSuppressions() {
  for (const file of sourceFiles) {
    if (file.startsWith("scripts/")) continue;
    const lines = read(file).split("\n");
    lines.forEach((text, i) => {
      const eslint = text.match(/eslint-disable(?:-next-line|-line)?(\s|$|\*)/);
      if (eslint && !/eslint-enable/.test(text) && !/\s--\s+\S/.test(text)) {
        fail(
          file,
          i + 1,
          "suppressions",
          "eslint-disable has no reason.",
          "fix the code, or write `// eslint-disable-next-line <rule> -- <why>`."
        );
      }
      const ts = text.match(/@ts-(expect-error|ignore|nocheck)\s*(.*)$/);
      if (ts && ts[2].trim().replace(/\*\/$/, "").trim() === "") {
        fail(
          file,
          i + 1,
          "suppressions",
          `@ts-${ts[1]} has no reason.`,
          `fix the type, or write \`// @ts-${ts[1]} <why>\`.`
        );
      }
    });
  }
}

function stripToComments(code) {
  const comments = [];
  let i = 0;
  let line = 1;
  let lastSignificant = "";
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === "/" && next === "/") {
      const end = code.indexOf("\n", i);
      const stop = end === -1 ? n : end;
      comments.push({ line, text: code.slice(i, stop) });
      i = stop;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = code.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      const text = code.slice(i, stop);
      comments.push({ line, text });
      line += text.split("\n").length - 1;
      i = stop;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < n && code[i] !== quote) {
        if (code[i] === "\\") i++;
        else if (code[i] === "\n") line++;
        else if (quote === "`" && code[i] === "$" && code[i + 1] === "{") {
          let depth = 1;
          i += 2;
          while (i < n && depth > 0) {
            if (code[i] === "{") depth++;
            else if (code[i] === "}") depth--;
            else if (code[i] === "\n") line++;
            if (depth > 0) i++;
          }
        }
        i++;
      }
      i++;
      lastSignificant = quote;
      continue;
    }
    if (
      c === "/" &&
      (lastSignificant === "" ||
        /[(,=:[!&|?{};+\-*%<>~^]/.test(lastSignificant))
    ) {
      i++;
      let inClass = false;
      while (i < n && (inClass || code[i] !== "/") && code[i] !== "\n") {
        if (code[i] === "\\") i++;
        else if (code[i] === "[") inClass = true;
        else if (code[i] === "]") inClass = false;
        i++;
      }
      i++;
      lastSignificant = "/";
      continue;
    }
    if (!/\s/.test(c)) lastSignificant = c;
    i++;
  }
  return comments;
}

function ruleComments() {
  for (const file of sourceFiles) {
    if (!layerOf(file) || matchesAny(file, config.commentsExempt)) continue;
    for (const { line, text } of stripToComments(read(file))) {
      if (MAGIC_COMMENT.test(text)) continue;
      if (/^\/\*\s*eslint-(disable|enable)/.test(text)) continue;
      fail(
        file,
        line,
        "comments",
        `comment: ${text.split("\n")[0].slice(0, 60)}`,
        "delete it; explain behaviour in FEATURE.md, invariants in a test name, tooling in the config file or AGENTS.md Tooling notes."
      );
    }
  }
}

function ruleNoClaudeMd() {
  for (const f of allFiles) {
    if (path.posix.basename(f) === "CLAUDE.md") {
      fail(
        f,
        null,
        "no-claude-md",
        "CLAUDE.md duplicates the contract.",
        "move anything still true into AGENTS.md and delete it."
      );
    }
  }
}

function ruleLegacy() {
  for (const dir of config.removedDirs) {
    if (exists(dir)) {
      fail(
        dir,
        null,
        "legacy",
        "removed directory has reappeared.",
        "put the code in its feature folder (see FEATURE_MAP.md)."
      );
    }
  }
}

function ruleConventions() {
  const entry = config.entryFiles.map(globToRegExp);
  for (const file of files) {
    if (file.startsWith("app/") && !entry.some((re) => re.test(file))) {
      fail(
        file,
        null,
        "conventions",
        "app/ is a thin entry layer.",
        "move the code into features/<name>/ or views/, and keep only layout, page, providers, globals.css and api/**/route.ts here."
      );
    }
  }
  for (const file of sourceFiles) {
    const text = read(file);
    const lines = text.split("\n");
    if (/^app\/api\/.*\/route\.ts$/.test(file)) {
      const code = lines.filter((l) => l.trim() && !/^\s*\/\//.test(l));
      if (
        !code.every(
          (l) =>
            /^export\s+\{[^}]*\}\s+from\s+["']@\/features\/[^"']+\/api\/[^"']+["'];?$/.test(
              l.trim()
            ) ||
            /^(export\s+const\s+(runtime|dynamic|maxDuration|revalidate)\b)/.test(
              l.trim()
            )
        )
      ) {
        fail(
          file,
          null,
          "conventions",
          "route files only re-export handlers.",
          'move the handler to features/<name>/api/<route>.ts and write `export { GET, POST } from "@/features/<name>/api/<route>";`.'
        );
      }
    }
    lines.forEach((l, i) => {
      if (isTestFile(file)) {
        if (/\b(test|it|describe)\.only\(/.test(l)) {
          fail(
            file,
            i + 1,
            "conventions",
            "`.only` would skip every other test.",
            "remove `.only` before committing."
          );
        }
        if (
          /\b(test|it|describe)\.skip\(\s*["'`]/.test(l) ||
          /\b(test|it|describe)\.skip\(\s*$/.test(l)
        ) {
          fail(
            file,
            i + 1,
            "conventions",
            "unconditional `.skip`.",
            "delete the test, or make it a conditional skip naming the cloud-only service (see AGENTS.md > Running locally)."
          );
        }
      } else if (layerOf(file)) {
        if (/\bconsole\.log\(/.test(l)) {
          fail(
            file,
            i + 1,
            "conventions",
            "console.log in production code.",
            "remove it, or use console.error/console.warn for a real failure."
          );
        }
        if (/data-testid/.test(l)) {
          fail(
            file,
            i + 1,
            "conventions",
            "data-testid in production code.",
            "query by role, label or text in the test instead."
          );
        }
      }
    });
  }
}

function ruleSync() {
  const blocks = new Map();
  for (const file of allFiles) {
    if (!/\.(md|mdc)$/.test(file)) continue;
    const lines = read(file).split("\n");
    for (let i = 0; i < lines.length; i++) {
      const start = lines[i].match(/<!--\s*sync:([\w-]+):start\s*-->/);
      if (!start) continue;
      const name = start[1];
      const end = lines.findIndex(
        (l, j) => j > i && new RegExp(`<!--\\s*sync:${name}:end\\s*-->`).test(l)
      );
      if (end === -1) {
        fail(
          file,
          i + 1,
          "sync",
          `sync block "${name}" has no end marker.`,
          `add \`<!-- sync:${name}:end -->\`.`
        );
        continue;
      }
      const body = lines
        .slice(i + 1, end)
        .map((l) => l.replace(/^\s+/, ""))
        .join("\n");
      if (!blocks.has(name)) blocks.set(name, []);
      blocks.get(name).push({ file, line: i + 1, body });
    }
  }
  for (const [name, copies] of blocks) {
    if (copies.length < 2) continue;
    const [source, ...rest] = copies;
    for (const copy of rest) {
      if (copy.body !== source.body) {
        fail(
          copy.file,
          copy.line,
          "sync",
          `sync block "${name}" differs from the copy in ${source.file}:${source.line}.`,
          "edit the canonical copy, then paste the same lines here."
        );
      }
    }
  }
}

function ruleSize() {
  for (const file of sourceFiles) {
    if (
      !layerOf(file) ||
      isTestFile(file) ||
      matchesAny(file, config.commentsExempt)
    )
      continue;
    const lines = read(file).split("\n").length;
    if (lines > config.sizeWarnLines) {
      warn(
        file,
        "size",
        `${lines} lines. One main concept per file; move pure logic into its own module.`
      );
    }
  }
}

// ------------------------------------------------------------------ modes

function printGraph(args) {
  const edges = featureEdges();
  const reverse = args.includes("--reverse");
  const target = args.find((a) => !a.startsWith("--"));
  if (target && !features.includes(target)) {
    console.error(
      `Unknown feature "${target}". Features: ${features.join(", ") || "(none yet)"}`
    );
    process.exit(1);
  }
  if (!target) {
    let count = 0;
    for (const [from, tos] of edges)
      for (const to of [...tos].sort()) {
        console.log(`${from} -> ${to}`);
        count++;
      }
    if (count === 0)
      console.log(`No feature -> feature edges (${features.length} features).`);
    return;
  }
  if (reverse) {
    const dependents = [...edges]
      .filter(([, tos]) => tos.has(target))
      .map(([f]) => f);
    console.log(
      dependents.length
        ? `${target} is imported by: ${dependents.join(", ")}`
        : `${target} has no dependents: changing its public surface breaks nothing else.`
    );
  } else {
    const deps = [...(edges.get(target) ?? [])].sort();
    console.log(
      deps.length
        ? `${target} depends on: ${deps.join(", ")}`
        : `${target} depends on no other feature.`
    );
  }
}

function printOwner(paths) {
  if (paths.length === 0) {
    console.error("Usage: npm run owner -- <path>...");
    process.exit(1);
  }
  for (const p of paths) {
    const rel = path.posix.normalize(
      path.relative(root, path.resolve(root, p)).split(path.sep).join("/")
    );
    const legacyKey = legacyGlobs.find((g) => matchesAny(rel, [g]));
    if (legacyKey) {
      console.log(
        `${rel}: not yet migrated, moving to ${config.legacy[legacyKey]} (see FEATURE_MAP.md > Not yet migrated)`
      );
      continue;
    }
    const f = featureOf(rel);
    const v = viewOf(rel);
    if (f)
      console.log(
        `${rel}: feature ${f} — ${config.featureRoot}/${f}/FEATURE.md`
      );
    else if (v)
      console.log(`${rel}: view ${v} — ${config.viewRoot}/${v}/FEATURE.md`);
    else if (layerOf(rel))
      console.log(
        `${rel}: layer ${layerOf(rel)} — see FEATURE_MAP.md (${layerOf(rel) === "lib" ? "Shared code" : layerOf(rel) === "components" ? "Building blocks" : "Cross-cutting"})`
      );
    else
      console.log(`${rel}: no layer (root config or tooling) — see AGENTS.md`);
  }
}

const argv = process.argv.slice(2);
if (argv[0] === "--graph") {
  printGraph(argv.slice(1));
  process.exit(0);
}
if (argv[0] === "--owner") {
  printOwner(argv.slice(1));
  process.exit(0);
}
if (argv.length > 0) {
  console.error(
    "Usage: node scripts/check-structure.mjs [--graph [feature] [--reverse] | --owner <path>...]"
  );
  process.exit(1);
}

ruleLayer();
rulePublicSurface();
ruleCycle();
ruleSurfaceShape();
ruleTestInfra();
ruleAnatomy();
ruleTestPlacement();
ruleFeatureMap();
ruleFeatureFiles();
ruleSuppressions();
ruleComments();
ruleNoClaudeMd();
ruleLegacy();
ruleConventions();
ruleSync();
ruleSize();

for (const w of warnings) console.log(w);
if (failures.length > 0) {
  for (const f of failures) console.log(f);
  console.log(
    `\nStructure check failed: ${failures.length} problem${failures.length === 1 ? "" : "s"}.`
  );
  process.exit(1);
}
console.log(
  `Structure check passed (${sourceFiles.length} source files, ${features.length} features${legacyGlobs.length ? `, ${legacyGlobs.length} legacy paths still to migrate` : ""}).`
);
