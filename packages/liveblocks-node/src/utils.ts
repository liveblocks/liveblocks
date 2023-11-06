export const DEFAULT_BASE_URL = "https://api.liveblocks.io";

export async function fetchPolyfill(): Promise<typeof fetch> {
  return typeof globalThis.fetch !== "undefined"
    ? globalThis.fetch
    : ((await import("node-fetch")).default as unknown as typeof fetch);
}

export function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function assertNonEmpty(
  value: unknown,
  field: string
): asserts value is string {
  if (!isNonEmpty(value)) {
    throw new Error(
      `Invalid value for field "${field}". Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize`
    );
  }
}

export function assertSecretKey(
  value: unknown,
  field: string
): asserts value is string {
  if (!isNonEmpty(value) || !value.startsWith("sk_")) {
    throw new Error(
      `Invalid value for field "${field}". Secret keys must start with "sk_". Please provide the secret key from your Liveblocks dashboard at https://liveblocks.io/dashboard/apikeys.`
    );
  }
}

export function normalizeStatusCode(statusCode: number): number {
  if (statusCode >= 200 && statusCode < 300) {
    return 200; /* OK */
  } else if (statusCode >= 500) {
    return 503; /* Service Unavailable */
  } else {
    return 403; /* Forbidden */
  }
}

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

declare const brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

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
