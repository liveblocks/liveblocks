const DEFAULT_BASE_URL = "https://api.liveblocks.io";

// Valid alphabet for secret/public keys
const VALID_KEY_CHARS_REGEX = /^[\w-]+$/;

export function getBaseUrl(baseUrl?: string | undefined): string {
  if (
    typeof baseUrl === "string" &&
    baseUrl.startsWith("http") // Must be http or https URL
  ) {
    return baseUrl;
  } else {
    return DEFAULT_BASE_URL;
  }
}

export async function fetchPolyfill(): Promise<typeof fetch> {
  return typeof globalThis.fetch !== "undefined"
    ? globalThis.fetch
    : ((await import("node-fetch")).default as unknown as typeof fetch);
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function startsWith<P extends string>(
  value: unknown,
  prefix: P
): value is `${P}${string}` {
  return isString(value) && value.startsWith(prefix);
}

function isNonEmpty(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

export function assertNonEmpty(
  value: unknown,
  field: string
): asserts value is string {
  if (!isNonEmpty(value)) {
    throw new Error(
      `Invalid value for field '${field}'. Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize`
    );
  }
}

export function assertSecretKey(
  value: unknown,
  field: string
): asserts value is string {
  if (!startsWith(value, "sk_")) {
    throw new Error(
      `Invalid value for field '${field}'. Secret keys must start with 'sk_'. Please provide the secret key from your Liveblocks dashboard at https://liveblocks.io/dashboard/apikeys.`
    );
  }

  if (!VALID_KEY_CHARS_REGEX.test(value)) {
    throw new Error(
      `Invalid chars found in field '${field}'. Please check that you correctly copied the secret key from your Liveblocks dashboard at https://liveblocks.io/dashboard/apikeys.`
    );
  }
}

export function normalizeStatusCode(statusCode: number): number {
  if (statusCode >= 200 && statusCode < 300) {
    return 200; /* OK */
  } else if (statusCode >= 500) {
    return 503; /* Service Unavailable */
  } else {
    return statusCode; // 429, 404, 403, 409, 422, 400
  }
}
