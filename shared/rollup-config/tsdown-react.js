import MagicString from "magic-string";

/**
 * Post-process chunks like Rollup `preserveUseClient` in {@link createConfig}.
 *
 * @returns {import("rolldown").Plugin}
 */
export function preserveUseClientPlugin() {
  return {
    name: "preserve-use-client",
    renderChunk: {
      order: "post",
      handler(code, chunk) {
        if (!("modules" in chunk)) {
          return null;
        }

        const magicString = new MagicString(code);
        const regex = /^(["'])use client\1;?/gm;
        const matches = Array.from(code.matchAll(regex));

        if (matches.length === 0) {
          return null;
        }

        for (const match of matches) {
          if (match.index === undefined) {
            continue;
          }
          magicString.remove(match.index, match.index + match[0].length);
        }

        magicString.prepend('"use client";\n');

        return {
          code: magicString.toString(),
          map: magicString.generateMap({ hires: true }),
        };
      },
    },
  };
}

/**
 * Replaces Rollup `@rollup/plugin-replace` for `__VERSION__` and `ROLLUP_FORMAT`
 * across ESM and CJS tsdown passes (same values as `createMainConfig` in this
 * package).
 *
 * @param {string} version `package.json` `version`
 */
export function dualFormatLibraryDefines(version) {
  const v = JSON.stringify(version);
  return {
    esm: {
      define: {
        __VERSION__: v,
        ROLLUP_FORMAT: JSON.stringify("esm"),
      },
    },
    cjs: {
      define: {
        __VERSION__: v,
        ROLLUP_FORMAT: JSON.stringify("cjs"),
      },
    },
  };
}

/**
 * External list aligned with `createMainConfig` externals: all dependency and
 * peerDependency names, plus implicit `react-dom`.
 *
 * @param {{ dependencies?: Record<string, string>, peerDependencies?: Record<string, string> }} pkg
 * @returns {string[]}
 */
export function libraryNeverBundleDeps(pkg) {
  return [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    "react-dom",
  ];
}

/**
 * ESM `.js` + CJS `.cjs` for packages with `"type": "module"` (matches Rollup
 * `entryFileNames` in `createMainConfig`).
 *
 * @param {{ format: string }} ctx
 */
export function libraryOutExtensionsTypeModule({ format }) {
  return {
    js: format === "cjs" ? ".cjs" : ".js",
  };
}
