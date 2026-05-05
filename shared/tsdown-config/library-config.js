import { fileURLToPath } from "node:url";

import { defineConfig } from "tsdown";

import { buildStylesheets } from "./build-stylesheets.js";
import {
  dualFormatLibraryDefines,
  libraryNeverBundleDeps,
  libraryOutExtensionsTypeModule,
} from "./tsdown-react.js";

/**
 * @typedef {Object} PkgSubset
 * @property {string} name
 * @property {string} version
 * @property {Record<string, string>} [dependencies]
 * @property {Record<string, string>} [peerDependencies]
 */

/**
 * @typedef {Object} StylesheetEntry
 * @property {string} entry Source path relative to the package root (e.g. `src/styles/index.css`).
 * @property {string} destination Output path relative to the package root (e.g. `styles.css`).
 */

/**
 * @typedef {Object} CreateLiveblocksLibraryTsdownConfigOptions
 * @property {PkgSubset} pkg Typically `package.json` imported in the package’s `tsdown.config.ts`.
 * @property {string | string[]} entry One or more entry module paths.
 * @property {"bundle" | "unbundle"} [mode] `bundle` (default): standard library chunk layout.
 *   `unbundle`: preserve-modules-style output for React/CSS packages (`platform: "browser"`, etc.).
 * @property {StylesheetEntry[]} [styleFiles] When set, runs `buildStylesheets` once after a successful build.
 * @property {ImportMeta} [importMeta] Pass `import.meta` from the config file when `styleFiles` is set
 *   (used to resolve the package directory).
 * @property {Record<string, unknown>} [config] Merged last into the returned config (escape hatch).
 */

/**
 * Factory for Liveblocks library `tsdown` configs, similar in spirit to
 * {@link defaultLiveblocksVitestConfig} for Vitest.
 *
 * @param {CreateLiveblocksLibraryTsdownConfigOptions} options
 * @returns {unknown}
 */
export function createLiveblocksLibraryTsdownConfig(options) {
  const {
    pkg,
    entry,
    mode = "bundle",
    styleFiles,
    importMeta,
    config: userConfig = {},
  } = options;

  const entries = typeof entry === "string" ? [entry] : entry;

  if (styleFiles?.length && importMeta === undefined) {
    throw new Error(
      "createLiveblocksLibraryTsdownConfig: pass `importMeta` when using `styleFiles`",
    );
  }

  /** @type {Record<string, unknown>} */
  const base = {
    entry: entries,
    dts: true,
    clean: true,
    format: dualFormatLibraryDefines(pkg.version),
    outExtensions: libraryOutExtensionsTypeModule,
    sourcemap: true,
    target: "es2022",
    deps: {
      neverBundle: libraryNeverBundleDeps(pkg),
    },
  };

  if (mode === "unbundle") {
    Object.assign(base, {
      unbundle: true,
      treeshake: false,
      platform: "browser",
      hash: false,
      failOnWarn: false,
      name: pkg.name,
    });
  }

  if (styleFiles?.length) {
    const packageDir = fileURLToPath(new URL(".", importMeta.url));
    base.onSuccess = async () => {
      await buildStylesheets(styleFiles, packageDir);
    };
  }

  return defineConfig({
    ...base,
    ...userConfig,
  });
}
