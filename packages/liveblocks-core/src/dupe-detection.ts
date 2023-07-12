const g = (
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : typeof global !== "undefined"
    ? global
    : {}
) as { [key: symbol]: string };

declare const PKG_VERSION: string;
const crossLinkedDocs = "https://liveblocks.io/errors/cross-linked";
const dupesDocs = "https://liveblocks.io/errors/dupes";

function error(msg: string): void {
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
  } else {
    throw new Error(msg);
  }
}

/**
 * Throws an error if multiple copies of a Liveblocks package are being loaded
 * at runtime. This likely indicates a packaging issue with the project.
 */
export function detectDupes(
  pkgName: string,
  pkgVersion: string,
  pkgFormat: string // 'esm' | 'cjs'
): void {
  const pkgId = Symbol.for(pkgName);
  const pkgBuildInfo = `${pkgVersion} (${pkgFormat})`;

  if (!g[pkgId]) {
    g[pkgId] = pkgBuildInfo;
  } else {
    const msg = `Multiple copies of Liveblocks are being loaded in your project. This will cause issues! See ${dupesDocs}

Conflicting copies in your bundle:
- ${pkgName} ${g[pkgId]} (already loaded)
- ${pkgName} ${pkgBuildInfo} (trying to load this now)`;
    error(msg);
  }

  if (pkgVersion !== PKG_VERSION) {
    error(
      `Cross-linked versions of Liveblocks found, which will cause issues! See ${crossLinkedDocs}

Conflicts:
- @liveblocks/core is at ${PKG_VERSION}
- ${pkgName} is at ${pkgVersion}

Always upgrade all Liveblocks packages to the same version number.`
    );
  }
}
