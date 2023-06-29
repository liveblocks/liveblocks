export function assertNonEmpty(
  value: unknown,
  field: string
): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Invalid value for field "${field}". Please provide a non-empty string. For more information: https://liveblocks.io/docs/api-reference/liveblocks-node#authorize`
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
