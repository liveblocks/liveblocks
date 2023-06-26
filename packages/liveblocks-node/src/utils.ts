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
