const g = (
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
    ? window
    : typeof global !== "undefined"
    ? global
    : {}
) as { [key: symbol]: string };

const docLink = "https://liveblocks.io/errors/dupe-imports";

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
    /**
     * XXX Include a copy of the documentation here as a comment, too.
     */
    const msg = `Multiple copies of Liveblocks are being loaded in your project. This will cause issues! See ${docLink}\n\n
Conflicting copies in your bundle:
- ${pkgName} ${g[pkgId]} (already loaded)
- ${pkgName} ${pkgBuildInfo} (trying to load this now)`;
    if (process.env.NODE_ENV === "production") {
      console.error(msg);
    } else {
      throw new Error(msg);
    }
  }
}
