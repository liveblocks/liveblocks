import MagicString from "magic-string";

/**
 * Collapse duplicate `"use client"` directives to a single top-of-file directive
 * per emitted chunk (Rolldown / tsdown).
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
 * Per-format compile-time defines for dual ESM/CJS library builds: package
 * version and module format (`"esm"` | `"cjs"`), exposed as `__FORMAT__`.
 *
 * @param {string} version `package.json` `version`
 */
export function dualFormatLibraryDefines(version) {
  const v = JSON.stringify(version);
  return {
    esm: {
      define: {
        __VERSION__: v,
        __FORMAT__: JSON.stringify("esm"),
      },
    },
    cjs: {
      define: {
        __VERSION__: v,
        __FORMAT__: JSON.stringify("cjs"),
      },
    },
  };
}

/**
 * Dependency names that must not be bundled: all `dependencies` and
 * `peerDependencies`, plus implicit `react-dom`.
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
 * ESM `.js` + CJS `.cjs` for packages with `"type": "module"`.
 *
 * @param {{ format: string }} ctx
 */
export function libraryOutExtensionsTypeModule({ format }) {
  return {
    js: format === "cjs" ? ".cjs" : ".js",
  };
}
