/* eslint-disable @typescript-eslint/no-unsafe-assignment */

function replacer(_key: string, value: unknown) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
          // @ts-expect-error this is fine
          sorted[key] = value[key];
          return sorted;
        }, {})
    : value;
}

/**
 * Like JSON.stringify(), but using stable (sorted) object key order, so that
 * it returns the same value for the same keys, no matter their order.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, replacer);
}

/**
 * Drop-in replacement for JSON.stringify(), which will log any payload to the
 * console if it could not be stringified somehow.
 */
export function stringifyOrLog(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (err) {
    /* eslint-disable local/console-must-be-fancy */
    console.error(`Could not stringify: ${(err as Error).message}`);
    console.error(value);
    /* eslint-enable local/console-must-be-fancy */
    throw err;
  }
}
