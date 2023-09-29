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

/**
 * Concatenates a path to a URL.
 */
export function urljoin(baseUrl: string | URL, path: string): string {
  const url = new URL(baseUrl);
  url.pathname = path;
  return url.toString();
}
