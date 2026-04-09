import { mkdirSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, join } from "path";
import { fileURLToPath } from "url";

const TMP_DIR = "liveblocks-typecheck";

/**
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  let slug = String(name ?? "")
    .replace(/[/\\]/g, "-")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[.\s]+|[.\s]+$/g, "");

  if (!slug) {
    slug = ".";
  }

  return slug;
}

/**
 * Prepare a Vitest config for typechecking test-d files. It writes a
 * temporary TS config that extends the package's `tsconfig.json`.
 *
 * @param {ImportMeta} importMeta Import meta object (e.g. `import.meta`).
 * @param {string[]} testFiles Test files to typecheck, relative to the package root.
 * @param {string | undefined} [name] Name of the test group.
 * @returns {import("vitest/node").InlineConfig}
 */
export function makeTypecheckTestConfig(importMeta, testFiles, name) {
  const pkgDir = fileURLToPath(new URL(".", importMeta.url));
  const tmpDirPath = join(tmpdir(), TMP_DIR, basename(pkgDir));
  const tmpTsConfigPath = join(tmpDirPath, `${slugify(name)}.json`);
  const absoluteTestFiles = testFiles.map((file) => join(pkgDir, file));

  // Vitest's `typecheck` needs a TS config to work, we generate a temporary one
  // automatically to avoid having to keep them at the root and duplicating `include` paths.
  mkdirSync(tmpDirPath, { recursive: true });
  writeFileSync(
    tmpTsConfigPath,
    JSON.stringify({
      extends: join(pkgDir, "tsconfig.json"),
      compilerOptions: {
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
      include: [join(pkgDir, "src"), ...absoluteTestFiles],
    })
  );

  return {
    name,
    typecheck: {
      enabled: true,
      only: true,
      ignoreSourceErrors: true,
      tsconfig: tmpTsConfigPath,
      include: absoluteTestFiles,
    },
  };
}
