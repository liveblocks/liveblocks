import type { Brand } from "./utils";

const PLACEHOLDER_BASE_URL = "https://localhost:9999";
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
const TRAILING_SLASH_URL_REGEX = /\/(?:(?:\?|#).*)?$/;

export type QueryParams =
  | Record<string, string | number | null | undefined>
  | URLSearchParams;

/**
 * Safely but conveniently build a URLSearchParams instance from a given
 * dictionary of values. For example:
 *
 *   {
 *     "foo": "bar+qux/baz",
 *     "empty": "",
 *     "n": 42,
 *     "nope": undefined,
 *     "alsonope": null,
 *   }
 *
 * Will produce a value that will get serialized as
 * `foo=bar%2Bqux%2Fbaz&empty=&n=42`.
 *
 * Notice how the number is converted to its string representation
 * automatically and the `null`/`undefined` values simply don't end up in the
 * URL.
 */
function toURLSearchParams(
  params: Record<string, string | number | null | undefined>
): URLSearchParams {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      result.set(key, value.toString());
    }
  }
  return result;
}

/**
 * Concatenates a path to an existing URL.
 */
export function urljoin(
  baseUrl: string | URL,
  path: string,
  params?: QueryParams
): string {
  // First, sanitize by removing user/passwd/search/hash parts from the URL
  const url = new URL(path, baseUrl);
  if (params !== undefined) {
    url.search = (
      params instanceof URLSearchParams ? params : toURLSearchParams(params)
    ).toString();
  }
  return url.toString();
}

/**
 * A string that is guaranteed to be URL safe (where all arguments are properly
 * encoded), only obtainable as the result of using `url` template strings.
 */
export type URLSafeString = Brand<string, "URLSafeString">;

/**
 * Builds a URL where each "hole" in the template string will automatically be
 * encodeURIComponent()-escaped, so it's impossible to build invalid URLs.
 */
export function url(
  strings: TemplateStringsArray,
  ...values: string[]
): URLSafeString {
  return strings.reduce(
    (result, str, i) => result + encodeURIComponent(values[i - 1] ?? "") + str
  ) as URLSafeString;
}

/**
 * Sanitize a URL (normalize www URLs, handle relative URLs, prevent XSS attacks, etc.)
 *
 * Accepted URLs:
 * - Absolute URLs with an http or https protocol (e.g. https://liveblocks.io)
 * - Absolute URLs with a `www` prefix (e.g. www.liveblocks.io)
 * - Relative URLs (e.g. /path/to/page)
 *
 * The presence/absence of trailing slashes is preserved.
 * Rejected URLs are returned as `null`.
 */
export function sanitizeUrl(url: string): string | null {
  // If the URL starts with "www.", normalize it as an HTTPS URL
  if (url.startsWith("www.")) {
    url = "https://" + url;
  }

  try {
    const isAbsolute = ABSOLUTE_URL_REGEX.test(url);
    const urlObject = new URL(
      url,
      isAbsolute ? undefined : PLACEHOLDER_BASE_URL
    );

    if (urlObject.protocol !== "http:" && urlObject.protocol !== "https:") {
      return null;
    }

    const hasTrailingSlash = TRAILING_SLASH_URL_REGEX.test(url);

    // Instead of using URL.toString(), we rebuild the URL manually
    // to preserve the presence/absence of trailing slashes.
    const sanitizedUrl =
      // 1. Origin, only for absolute URLs
      (isAbsolute ? urlObject.origin : "") +
      // 2. Pathname, with a trailing slash if the original URL had one
      (urlObject.pathname === "/"
        ? // 2.a. Domain-only URLs, they always have their pathname set to "/"
          hasTrailingSlash
          ? "/"
          : ""
        : // 2.b. URLs with a path
          hasTrailingSlash && !urlObject.pathname.endsWith("/")
          ? urlObject.pathname + "/"
          : urlObject.pathname) +
      // 3. Search params
      urlObject.search +
      // 4. Hash
      urlObject.hash;

    return sanitizedUrl !== "" ? sanitizedUrl : null;
  } catch {
    return null;
  }
}

/**
 * Construct a URL with optional parameters and hash.
 */
export function generateUrl(
  url: string,
  params?: Record<string, string | number | undefined>,
  hash?: string
): string {
  const isAbsolute = ABSOLUTE_URL_REGEX.test(url);
  const urlObject = new URL(url, isAbsolute ? undefined : PLACEHOLDER_BASE_URL);

  if (params !== undefined) {
    for (const [param, value] of Object.entries(params)) {
      if (value) {
        urlObject.searchParams.set(param, String(value));
      }
    }
  }

  // Only add the new hash if the URL does not already have one
  if (!urlObject.hash && hash !== undefined) {
    urlObject.hash = `#${hash}`;
  }

  return isAbsolute
    ? urlObject.href
    : urlObject.href.replace(PLACEHOLDER_BASE_URL, "");
}
