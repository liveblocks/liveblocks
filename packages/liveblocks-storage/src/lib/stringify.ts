/**
 * Drop-in replacement for JSON.stringify(), which will log any payload to the
 * console if it could not be stringified somehow.
 */
export function stringifyOrLog(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    console.error(`Could not stringify: ${(err as Error).message}`);
    console.error(value);
    throw err;
  }
}
