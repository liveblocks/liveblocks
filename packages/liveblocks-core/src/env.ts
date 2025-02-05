/**
 * Environment variable reading strategy that works across bundlers and module
 * systems.
 *
 * The key challenge is that different bundlers handle env vars differently:
 *
 * - Most bundlers replace `process.env.*` with literal values at build time
 * - Vite instead replaces `import.meta.env.*`
 *   (except for `process.env.NODE_ENV`, but not other `process.env.*`)
 *
 * Solution: first, we use a try-catch wrapper `_(() => ...)` to catch any
 * runtime errors:
 *
 *     _(() => process.env.*) || _(() => import.meta.env.*)
 *
 * This will produce:
 *
 * Vite:  _(() => process.env.*) || _(() => "my value")
 * Other: _(() => "my value")    || _(() => import.meta.env.*)
 *
 * Special CJS handling: Since `import.meta` is invalid syntax in CommonJS,
 * we avoid using `import.meta` in any source code and instead use
 * a placeholder (`__IMPORT_META__`), which we replace as follows:
 * - ESM output: `import.meta`
 * - CJS output: `null` (causing runtime error instead of parse error)
 */

// Just so TypeScript doesn't trip up on `__IMPORT_META__`
declare let __IMPORT_META__: { env: Record<string, string | undefined> };

const noThrow = <T>(fn: () => T): T | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

export const DEFAULT_BASE_URL = "https://api.liveblocks.io";

function getBaseUrlFromEnv(): unknown {
  //                          ^^^^^^^ Deliberately unknown. We should always verify and never trust this returned value.
  return (
    noThrow(() => process.env.LIVEBLOCKS_BASE_URL) ??
    noThrow(() => process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL) ??
    noThrow(() => __IMPORT_META__.env.VITE_LIVEBLOCKS_BASE_URL)
  );
}

export function getBaseUrl(baseUrl?: string | undefined): string {
  const targetBaseUrl = baseUrl ?? getBaseUrlFromEnv();
  if (
    typeof targetBaseUrl === "string" &&
    targetBaseUrl.startsWith("http") // Must be http or https URL
  ) {
    return targetBaseUrl;
  } else {
    return DEFAULT_BASE_URL;
  }
}
