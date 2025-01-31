/**
 * RATIONALE
 * =========
 * Here is how we read from environmental variables in a way that works with
 * every environment, framework, or bundler.
 *
 * It requires a bit of a hack that operates on multiple levels.
 *
 * First, here is a quick recap of how a bundler works. When a bundler reads an
 * input file, and it sees the expression `process.env.SOME_VAR`, it will
 * statically replace this with the value it reads from, say, a `.env` file.
 *
 * The JS output the bundler produces will therefore not contain the expression
 * `process.env.SOME_VAR` anymore. It will contain either the literal string
 * value, i.e. `"my value"`, or `undefined`, right where that
 * `process.env.SOME_VAR` expression used to exist.
 *
 * Nice, so then we can just put `process.env.LIVEBLOCKS_BASE_URL` in there,
 * right? Well, not quite. Many bundlers exist, and notably Vite takes
 * a different approach.
 *
 * How does Vite differ?
 *
 * Vite does not replace `process.env` expressions at build time. With the
 * exception of `process.env.NODE_ENV`. That's the only one it will replace. So
 * if you use Vite, the expression `process.env.SOME_VAR` will remain to exist
 * in the output bundle, and thus will fail at runtime (`process not defined`).
 *
 * Instead, Vite uses the `import.meta.env.SOME_VAR` to do similar rewriting.
 *
 * OK, so if we just write `process.env.SOME_VAR || import.meta.env.SOME_VAR`,
 * then we should be good, right? Well, not quite, because:
 *
 * Vite:  process.env.SOME_VAR || "my value"
 * Other: "my value" || import.meta.env.SOME_VAR
 *
 * We don't want any of that in our output. So, what if we wrote a small
 * wrapper that catches any runtime errors, and use:
 *
 *     _(() => process.env.SOME_VAR) || _(() => import.meta.env.SOME_VAR)
 *
 * Vite:  _(() => process.env.SOME_VAR) || _(() => "myvalue")
 * Other: _(() => "my value") || _(() => import.meta.env.SOME_VAR)
 *
 * Now, however, we're *still* not there yet. If you're using ES modules (i.e.
 * your project has `"type": "module"`, or you're using `*.mjs` files), then
 * this works. However, if your project is still on `"type": "commonjs"`, then
 * the problem is that `import.meta` is invalid syntax, and it will actually be
 * a *parse error*, not even a runtime error.
 *
 * Huh?
 * It looks like `import.meta` is accessing the `meta` property of a global
 * `import`, but this is not true. It's a special syntax that is not recognized
 * by the JS parser when in CJS.
 *
 * So, what we do instead: we avoid using `import.meta` in any source files in
 * this Liveblocks monorepo, and when we build our own bundle (`dist/*`), we
 * replace it with:
 *
 * - `null` (if we're using CJS)
 * - `import.meta` (if we're using ESM)
 *
 * This will produce the following code in _our_ bundle:
 *
 *     _(() => process.env.SOME_VAR) || _(() => import.meta.env.SOME_VAR)   (in our ESM output)
 *     _(() => process.env.SOME_VAR) || _(() => null.env.SOME_VAR)          (in our CJS output)
 *
 * This way, there will at least not be a *parse error* there, but a *runtime*
 * error, which is nicely caught and falls back to `undefined`.
 */

import { DEFAULT_BASE_URL } from "./constants";

// Just so TypeScript doesn't trip up on `__IMPORT_META__`
declare let __IMPORT_META__: { env: Record<string, string> };

const safeGet = (fn: () => string | undefined): string | undefined => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

const getFromEnvVar = (): string | undefined => {
  return (
    safeGet(() => process.env.LIVEBLOCKS_BASE_URL) ??
    safeGet(() => process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL) ??
    safeGet(() => __IMPORT_META__.env.VITE_LIVEBLOCKS_BASE_URL)
  );
};

export function getBaseUrl(baseUrl?: string | undefined): string {
  const targetBaseUrl = baseUrl ?? getFromEnvVar();

  if (
    typeof targetBaseUrl === "string" &&
    // Check on the string value `"undefined"` because of our tsup config
    targetBaseUrl !== "undefined" &&
    targetBaseUrl.startsWith("http") // Must be http or https URL
  ) {
    return targetBaseUrl;
  } else {
    return DEFAULT_BASE_URL;
  }
}
