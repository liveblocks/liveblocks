import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

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
 * Uses process.cwd() instead of import.meta.url because vitest 4's
 * module runner rewrites import.meta.url to a virtual .vite-temp/ path.
 *
 * @param {string[]} testFiles Test files to typecheck, relative to the package root.
 * @param {string | undefined} [name] Name of the test group.
 * @returns {import("vitest/node").InlineConfig}
 */
export function makeTypecheckTestConfig(testFiles, name) {
  const pkgDir = process.cwd();
  if (!existsSync(join(pkgDir, "tsconfig.json"))) {
    throw new Error(
      "makeTypecheckTestConfig must be run from a package directory"
    );
  }
  const tmpDirPath = join(pkgDir, ".vitest-typecheck");
  const tmpTsConfigName = `${slugify(name)}.json`;

  mkdirSync(tmpDirPath, { recursive: true });
  writeFileSync(
    join(tmpDirPath, tmpTsConfigName),
    JSON.stringify({
      extends: "../tsconfig.json",
      compilerOptions: {
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
      include: ["../src", ...testFiles.map((f) => `../${f}`)],
    })
  );

  return {
    name,
    typecheck: {
      enabled: true,
      only: true,
      ignoreSourceErrors: true,
      tsconfig: `./.vitest-typecheck/${tmpTsConfigName}`,
      include: testFiles,
    },
  };
}
