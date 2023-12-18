import { PKG_NAME, PKG_VERSION } from "./version";

const g = (
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
        ? global
        : {}
) as { [key: symbol]: string };

const crossLinkedDocs = "https://liveblocks.io/docs/errors/cross-linked";
const dupesDocs = "https://liveblocks.io/docs/errors/dupes";
const SPACE = " "; // Important space to make sure links in errors are clickable in all browsers

function error(msg: string): void {
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line rulesdir/console-must-be-fancy
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
  pkgVersion: string | false, // false if not built yet
  pkgFormat: string | false // false if not built yet
): void {
  const pkgId = Symbol.for(pkgName);
  const pkgBuildInfo = pkgFormat
    ? `${pkgVersion || "dev"} (${pkgFormat})`
    : pkgVersion || "dev";

  if (!g[pkgId]) {
    g[pkgId] = pkgBuildInfo;
  } else if (g[pkgId] === pkgBuildInfo) {
    // Allow it, see https://github.com/liveblocks/liveblocks/pull/1004
  } else {
    const msg = [
      `Multiple copies of Liveblocks are being loaded in your project. This will cause issues! See ${
        dupesDocs + SPACE
      }`,
      "",
      "Conflicts:",
      `- ${pkgName} ${g[pkgId]} (already loaded)`,
      `- ${pkgName} ${pkgBuildInfo} (trying to load this now)`,
    ].join("\n");
    error(msg);
  }

  if (pkgVersion && PKG_VERSION && pkgVersion !== PKG_VERSION) {
    error(
      [
        `Cross-linked versions of Liveblocks found, which will cause issues! See ${
          crossLinkedDocs + SPACE
        }`,
        "",
        "Conflicts:",
        `- ${PKG_NAME} is at ${PKG_VERSION}`,
        `- ${pkgName} is at ${pkgVersion}`,
        "",
        "Always upgrade all Liveblocks packages to the same version number.",
      ].join("\n")
    );
  }
}
