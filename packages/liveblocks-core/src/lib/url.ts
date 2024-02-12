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
